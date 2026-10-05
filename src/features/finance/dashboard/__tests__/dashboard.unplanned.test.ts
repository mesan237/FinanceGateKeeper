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

import { getDashboardSnapshot } from '@/features/finance/dashboard/dashboard.service';
import { createExpense } from '@/features/finance/expenses/expenses.service';

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

function logExpense(amount: number, date: string, isUnplanned: boolean) {
  return createExpense({
    amount,
    categoryId: 1,
    subcategoryId: null,
    note: null,
    date,
    isRecurring: false,
    isUnplanned,
  });
}

describe('getDashboardSnapshot — imprévus', () => {
  it("counts the month's imprévus and what they cost", async () => {
    await logExpense(4000, '2026-10-01', true);
    await logExpense(6000, '2026-10-03', true);
    await logExpense(9000, '2026-10-02', false);
    // Last month's imprévu stays out of this month's figure.
    await logExpense(1000, '2026-09-30', true);

    const state = await getDashboardSnapshot('2026-10', '2026-10-03');

    expect(state.unplanned).toEqual({ count: 2, total: 10000 });
  });
});
