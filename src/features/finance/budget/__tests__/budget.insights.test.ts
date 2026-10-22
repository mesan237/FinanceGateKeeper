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

import { getBudgetTrend } from '@/features/finance/budget/budget.insights';
import { createExpense } from '@/features/finance/expenses/expenses.service';

let sqlite: Database.Database;

const FOOD = 1;

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
