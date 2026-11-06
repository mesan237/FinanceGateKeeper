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

import { setCategoryCostType } from '@/features/finance/expenses/expenses.costType';
import { recordRefund } from '@/features/finance/expenses/expenses.refunds';
import { createExpense } from '@/features/finance/expenses/expenses.service';
import {
  compareEveryday,
  getEverydayVsLastMonth,
} from '@/features/finance/dashboard/dashboard.lastMonth';

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

/** Logs one expense; everyday (variable, not recurring, not an imprévu) unless told otherwise. */
async function spend(
  date: string,
  amount: number,
  extra: { categoryId?: number; isRecurring?: boolean; isUnplanned?: boolean } = {},
): Promise<number> {
  return createExpense({
    amount,
    categoryId: extra.categoryId ?? 1,
    subcategoryId: null,
    note: null,
    date,
    isRecurring: extra.isRecurring ?? false,
    isUnplanned: extra.isUnplanned ?? false,
  });
}

describe('compareEveryday (pure, VS-95)', () => {
  it('gives the change from the same point last month, in whole percent', () => {
    expect(compareEveryday(52_000, 40_000)).toEqual({ current: 52_000, previous: 40_000, change: 30 });
    expect(compareEveryday(28_000, 40_000)).toEqual({ current: 28_000, previous: 40_000, change: -30 });
  });

  it('says nothing when last month had no everyday spending by then: no basis to compare', () => {
    expect(compareEveryday(10_000, 0)).toBeNull();
  });
});

describe('getEverydayVsLastMonth (VS-95)', () => {
  it('compares everyday spending so far with last month up to the same day', async () => {
    await spend('2026-10-02', 15_000);
    await spend('2026-10-05', 25_000);
    await spend('2026-10-06', 99_000); // after the 5th last month: not counted
    await spend('2026-11-01', 20_000);
    await spend('2026-11-05', 32_000);

    expect(await getEverydayVsLastMonth('2026-11', '2026-11-05')).toEqual({
      current: 52_000,
      previous: 40_000,
      change: 30,
      lastMonthDate: '2026-10-05',
    });
  });

  it('leaves out fixed categories, auto-logged bills and imprévus, which would make it jump', async () => {
    await setCategoryCostType(2, 'fixed');
    await spend('2026-10-03', 40_000);
    await spend('2026-11-02', 40_000);
    await spend('2026-11-02', 150_000, { categoryId: 2 }); // rent, in a fixed category
    await spend('2026-11-03', 9_000, { isRecurring: true });
    await spend('2026-11-04', 7_000, { isUnplanned: true });

    expect(await getEverydayVsLastMonth('2026-11', '2026-11-05')).toMatchObject({
      current: 40_000,
      previous: 40_000,
      change: 0,
    });
  });

  it('counts a refund against the spending it gives back', async () => {
    await spend('2026-10-03', 40_000);
    const purchase = await spend('2026-11-02', 50_000);
    await recordRefund(purchase, { amount: 10_000, accountId: null, date: '2026-11-03' });

    expect(await getEverydayVsLastMonth('2026-11', '2026-11-05')).toMatchObject({ current: 40_000 });
  });

  it('stops at the last day of a shorter month', async () => {
    await spend('2026-09-30', 30_000);
    await spend('2026-10-31', 33_000);

    expect(await getEverydayVsLastMonth('2026-10', '2026-10-31')).toMatchObject({
      previous: 30_000,
      lastMonthDate: '2026-09-30',
    });
  });

  it('waits until the 3rd: one or two days say nothing about a month', async () => {
    await spend('2026-10-01', 10_000);
    await spend('2026-11-01', 20_000);

    expect(await getEverydayVsLastMonth('2026-11', '2026-11-02')).toBeNull();
  });

  it('says nothing when last month has no spending to compare with', async () => {
    await spend('2026-11-04', 20_000);

    expect(await getEverydayVsLastMonth('2026-11', '2026-11-05')).toBeNull();
  });
});
