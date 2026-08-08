import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import {
  getBudgetTrend,
  getMonthOverMonth,
  rankByBudgetShare,
} from '@/features/finance/budget/budget.insights';
import type { CategoryBudgetProgress } from '@/features/finance/budget/budget.types';
import { createExpense } from '@/features/finance/expenses/expenses.service';

let sqlite: Database.Database;

const FOOD = 1;
const TRANSPORT = 5;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

async function spend(date: string, amount: number, categoryId = FOOD): Promise<void> {
  await createExpense({
    amount,
    categoryId,
    subcategoryId: null,
    note: null,
    date,
    isRecurring: false,
  });
}

function progress(overrides: Partial<CategoryBudgetProgress>): CategoryBudgetProgress {
  return {
    categoryId: FOOD,
    categoryName: 'Food',
    allocated: 60_000,
    carriedIn: 0,
    available: 60_000,
    spent: 0,
    remaining: 60_000,
    consumedPct: 0,
    dailyAverage: 0,
    projected: 0,
    expectedToDate: 0,
    rolloverEnabled: false,
    health: 'on_track',
    ...overrides,
  };
}

describe('rankByBudgetShare', () => {
  it('ranks by spend, as a share of the whole budget', () => {
    const ranked = rankByBudgetShare(
      [
        progress({ categoryId: FOOD, categoryName: 'Food', spent: 60_000 }),
        progress({ categoryId: TRANSPORT, categoryName: 'Transport', spent: 20_000 }),
      ],
      200_000,
    );

    expect(ranked.map((r) => r.categoryName)).toEqual(['Food', 'Transport']);
    expect(ranked[0].shareOfBudgetPct).toBe(30);
    expect(ranked[1].shareOfBudgetPct).toBe(10);
  });

  it('drops categories with no spending', () => {
    const ranked = rankByBudgetShare([progress({ spent: 0 })], 200_000);
    expect(ranked).toHaveLength(0);
  });

  it('caps the list at the requested limit', () => {
    const many = [1, 2, 3, 4, 5, 6].map((id) =>
      progress({ categoryId: id, categoryName: `C${id}`, spent: id * 1_000 }),
    );
    expect(rankByBudgetShare(many, 200_000, 3)).toHaveLength(3);
  });

  it('reports a zero share rather than dividing by zero', () => {
    expect(rankByBudgetShare([progress({ spent: 5_000 })], 0)[0].shareOfBudgetPct).toBe(0);
  });
});

describe('getBudgetTrend', () => {
  it('buckets the month into weekly totals', async () => {
    await spend('2026-08-02', 10_000);
    await spend('2026-08-10', 4_000);

    const trend = await getBudgetTrend('2026-08', 310_000, '2026-08-15');

    expect(trend.weekly[0]).toBe(10_000);
    expect(trend.weekly[1]).toBe(4_000);
  });

  it('reports the even weekly pace for the budget', async () => {
    // 310,000 over a 31-day August is 10,000/day, so 70,000 a week.
    const trend = await getBudgetTrend('2026-08', 310_000, '2026-08-15');
    expect(trend.weeklyPace).toBe(70_000);
  });

  it('builds a burn-down that ends at today', async () => {
    const trend = await getBudgetTrend('2026-08', 310_000, '2026-08-05');
    expect(trend.burndown).toHaveLength(6); // days 0..5
    expect(trend.burndown[0].actual).toBe(310_000);
  });

  it('ignores expenses outside the month', async () => {
    await spend('2026-07-30', 50_000);

    const trend = await getBudgetTrend('2026-08', 310_000, '2026-08-15');

    expect(trend.weekly.every((w) => w === 0)).toBe(true);
  });
});

describe('getMonthOverMonth', () => {
  it('returns nothing when there is no previous month to compare against', async () => {
    await spend('2026-08-02', 10_000);
    expect(await getMonthOverMonth('2026-08')).toEqual([]);
  });

  it('compares each category against the month before', async () => {
    await spend('2026-07-02', 30_000, FOOD);
    await spend('2026-08-02', 45_000, FOOD);

    const [food] = await getMonthOverMonth('2026-08');

    expect(food.categoryName).toBe('Food');
    expect(food.previous).toBe(30_000);
    expect(food.current).toBe(45_000);
    expect(food.changePct).toBe(50);
  });

  it('reports a null change for a category that is new this month', async () => {
    await spend('2026-07-02', 30_000, FOOD);
    await spend('2026-08-02', 9_000, TRANSPORT);

    const transport = (await getMonthOverMonth('2026-08')).find(
      (t) => t.categoryId === TRANSPORT,
    )!;

    expect(transport.previous).toBe(0);
    expect(transport.changePct).toBeNull();
  });

  it('includes a category that stopped being spent on', async () => {
    await spend('2026-07-02', 30_000, FOOD);
    await spend('2026-08-02', 9_000, TRANSPORT);

    const food = (await getMonthOverMonth('2026-08')).find((t) => t.categoryId === FOOD)!;

    expect(food.current).toBe(0);
    expect(food.previous).toBe(30_000);
    expect(food.changePct).toBe(-100);
  });

  it('sorts by the size of the move, so the biggest change leads', async () => {
    await spend('2026-07-02', 30_000, FOOD);
    await spend('2026-07-02', 10_000, TRANSPORT);
    await spend('2026-08-02', 31_000, FOOD); // +1,000
    await spend('2026-08-02', 30_000, TRANSPORT); // +20,000

    const trends = await getMonthOverMonth('2026-08');

    expect(trends[0].categoryId).toBe(TRANSPORT);
  });
});
