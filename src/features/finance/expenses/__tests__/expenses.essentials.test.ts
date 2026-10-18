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

import { setCategoryCostType, spendKindOf } from '@/features/finance/expenses/expenses.costType';
import { getObservedFixedAverage } from '@/features/finance/expenses/expenses.essentials';
import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';
import { daysInMonth } from '@/utils/monthMath';

let sqlite: Database.Database;

const FIXED = 1;
const VARIABLE = 5;
const TODAY = '2026-10-18';

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  await setCategoryCostType(FIXED, 'fixed');
  await setCategoryCostType(VARIABLE, 'variable');
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

/** Confirms every day of `monthISO` as logged, so the month is complete. */
async function completeMonth(monthISO: string): Promise<void> {
  for (let day = 1; day <= daysInMonth(monthISO); day += 1) {
    await confirmZeroDay(`${monthISO}-${String(day).padStart(2, '0')}`);
  }
}

async function spend(
  date: string,
  amount: number,
  categoryId: number,
  extra: { isRecurring?: boolean; isUnplanned?: boolean } = {},
): Promise<void> {
  await createExpense({
    amount,
    categoryId,
    subcategoryId: null,
    note: null,
    date,
    isRecurring: extra.isRecurring ?? false,
    isUnplanned: extra.isUnplanned ?? false,
  });
}

describe('spendKindOf', () => {
  const kindOf = (categoryId: number) => (categoryId === FIXED ? ('fixed' as const) : ('variable' as const));

  it('counts a surprise as unexpected before anything else', () => {
    expect(spendKindOf({ categoryId: FIXED, subcategoryId: null, isRecurring: true, isUnplanned: true }, kindOf)).toBe(
      'unexpected',
    );
  });

  it('counts an auto-logged recurring bill as fixed, whatever its category', () => {
    expect(spendKindOf({ categoryId: VARIABLE, subcategoryId: null, isRecurring: true, isUnplanned: false }, kindOf)).toBe(
      'fixed',
    );
  });

  it('otherwise follows the category tag', () => {
    expect(spendKindOf({ categoryId: VARIABLE, subcategoryId: null, isRecurring: false, isUnplanned: false }, kindOf)).toBe(
      'variable',
    );
  });
});

describe('getObservedFixedAverage', () => {
  it('has nothing to say before a month is complete', async () => {
    await spend('2026-09-03', 50_000, FIXED);

    expect(await getObservedFixedAverage(TODAY)).toEqual({ average: null, completeMonths: 0 });
  });

  it('averages fixed spending over the complete months before this one', async () => {
    await completeMonth('2026-08');
    await completeMonth('2026-09');
    await spend('2026-08-05', 100_000, FIXED);
    await spend('2026-09-05', 120_000, FIXED);
    await spend('2026-09-10', 20_000, VARIABLE, { isRecurring: true }); // a recurring bill is fixed
    await spend('2026-09-12', 40_000, VARIABLE); // variable: left out
    await spend('2026-09-14', 30_000, FIXED, { isUnplanned: true }); // a surprise: left out
    await spend('2026-10-05', 999_000, FIXED); // this month is still being lived

    expect(await getObservedFixedAverage(TODAY)).toEqual({ average: 120_000, completeMonths: 2 });
  });

  it('leaves an incomplete month out rather than guessing', async () => {
    await completeMonth('2026-09');
    await spend('2026-08-05', 300_000, FIXED);
    await spend('2026-09-05', 90_000, FIXED);

    expect(await getObservedFixedAverage(TODAY)).toEqual({ average: 90_000, completeMonths: 1 });
  });
});
