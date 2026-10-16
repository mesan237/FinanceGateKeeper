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

import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';
import {
  buildSpendingProfile,
  getSpendingProfile,
  habitSavingsPotential,
  type ProfileExpense,
} from '@/features/finance/reports/reports.profile';

let sqlite: Database.Database;

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

const FOOD = 1;
const BILLS = 3;
const TRANSPORT = 2;
const labelOf = (id: number) => ({ 1: 'Food', 2: 'Transport', 3: 'Bills' })[id] ?? '?';
const kindOf = (id: number): 'fixed' | 'variable' => (id === BILLS ? 'fixed' : 'variable');

function expense(month: string, categoryId: number, amount: number, extra: Partial<ProfileExpense> = {}): ProfileExpense {
  return {
    date: `${month}-10`,
    amount,
    categoryId,
    subcategoryId: null,
    isRecurring: false,
    isUnplanned: false,
    ...extra,
  };
}

const COMPLETE = (month: string) => ({ month, coverage: 0.9, isComplete: true });
const PARTIAL = (month: string) => ({ month, coverage: 0.3, isComplete: false });

describe('buildSpendingProfile (VS-41)', () => {
  it('averages fixed, variable and unexpected spending over the complete months', () => {
    const profile = buildSpendingProfile({
      months: [COMPLETE('2026-07'), COMPLETE('2026-08')],
      expenses: [
        expense('2026-07', BILLS, 100_000),
        expense('2026-08', BILLS, 100_000),
        expense('2026-07', FOOD, 60_000),
        expense('2026-08', FOOD, 40_000),
        expense('2026-08', FOOD, 10_000, { isUnplanned: true }),
      ],
      kindOf: (categoryId) => kindOf(categoryId),
      labelOf,
    });

    expect(profile.average).toEqual({ total: 155_000, fixed: 100_000, variable: 50_000, unexpected: 5_000 });
  });

  it('counts a recurring expense as fixed whatever its category', () => {
    const profile = buildSpendingProfile({
      months: [COMPLETE('2026-08')],
      expenses: [expense('2026-08', FOOD, 25_000, { isRecurring: true })],
      kindOf: (categoryId) => kindOf(categoryId),
      labelOf,
    });

    expect(profile.average).toMatchObject({ fixed: 25_000, variable: 0 });
    expect(profile.fixedCategories.map((c) => c.categoryId)).toEqual([FOOD]);
  });

  it('ranks variable categories by average, with the cheapest and dearest month', () => {
    const profile = buildSpendingProfile({
      months: [COMPLETE('2026-06'), COMPLETE('2026-07'), COMPLETE('2026-08')],
      expenses: [
        expense('2026-06', FOOD, 50_000),
        expense('2026-07', FOOD, 70_000),
        expense('2026-08', FOOD, 60_000),
        expense('2026-07', TRANSPORT, 30_000),
      ],
      kindOf: (categoryId) => kindOf(categoryId),
      labelOf,
    });

    expect(profile.variableCategories).toEqual([
      { categoryId: FOOD, categoryLabel: 'Food', average: 60_000, lowest: 50_000, highest: 70_000 },
      // Two complete months without transport are real zeros, not gaps.
      { categoryId: TRANSPORT, categoryLabel: 'Transport', average: 10_000, lowest: 0, highest: 30_000 },
    ]);
  });

  it('leaves incomplete months out of every figure', () => {
    const profile = buildSpendingProfile({
      months: [PARTIAL('2026-07'), COMPLETE('2026-08')],
      expenses: [expense('2026-07', FOOD, 500_000), expense('2026-08', FOOD, 40_000)],
      kindOf: (categoryId) => kindOf(categoryId),
      labelOf,
    });

    expect(profile.average?.variable).toBe(40_000);
    expect(profile.months).toHaveLength(2);
  });

  it('has no average until a month is complete, but still reports coverage', () => {
    const profile = buildSpendingProfile({
      months: [PARTIAL('2026-08')],
      expenses: [expense('2026-08', FOOD, 40_000)],
      kindOf: (categoryId) => kindOf(categoryId),
      labelOf,
    });

    expect(profile.average).toBeNull();
    expect(profile.variableCategories).toEqual([]);
    expect(profile.months[0].coverage).toBe(0.3);
  });
});

describe('getSpendingProfile', () => {
  it('reads the three months before today and splits them on the category tags', async () => {
    for (let d = 1; d <= 30; d += 1) await confirmZeroDay(`2026-09-${String(d).padStart(2, '0')}`);
    const base = { subcategoryId: null, note: null, isRecurring: false };
    // Category 9 is the seeded Bills (fixed since migration 036); 1 is Food.
    await createExpense({ ...base, amount: 80_000, categoryId: 9, date: '2026-09-01' });
    await createExpense({ ...base, amount: 45_000, categoryId: 1, date: '2026-09-12' });
    await createExpense({ ...base, amount: 99_000, categoryId: 1, date: '2026-10-02' });

    const profile = await getSpendingProfile('2026-10-13');

    expect(profile.months.map((m) => m.month)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(profile.average).toEqual({ total: 125_000, fixed: 80_000, variable: 45_000, unexpected: 0 });
  });
});

describe('habitSavingsPotential', () => {
  const category = (average: number, lowest: number) => ({
    categoryId: 1,
    categoryLabel: 'Food',
    average,
    lowest,
    highest: average,
  });

  it('adds up how far each variable category sits above its cheapest month', () => {
    const profile = {
      months: [COMPLETE('2026-07'), COMPLETE('2026-08')],
      average: { total: 0, fixed: 0, variable: 0, unexpected: 0 },
      variableCategories: [category(60_000, 50_000), category(10_000, 0)],
      fixedCategories: [category(100_000, 90_000)],
    };
    // Fixed costs are commitments, so only the variable rows count.
    expect(habitSavingsPotential(profile)).toBe(20_000);
  });

  it('is zero with a single complete month, where cheapest and average coincide', () => {
    const profile = {
      months: [COMPLETE('2026-08')],
      average: { total: 0, fixed: 0, variable: 0, unexpected: 0 },
      variableCategories: [category(60_000, 60_000)],
      fixedCategories: [],
    };
    expect(habitSavingsPotential(profile)).toBe(0);
  });
});
