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

import { execute } from '@/services/database';
import { confirmBalance, getAccountBalance, logTransfer } from '@/features/finance/accounts/accounts.service';

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

async function income(amount: number, date: string): Promise<void> {
  await execute(
    `INSERT INTO income (amount, source, note, date, account_id, created_at)
     VALUES (?, 'salary', NULL, ?, 1, '2026-09-01T00:00:00Z')`,
    [amount, date],
  );
}

describe('getAccountBalance as of a date (VS-53)', () => {
  it('counts only what happened on or before the date', async () => {
    await income(100_000, '2026-09-10');
    await income(50_000, '2026-09-30');
    await income(70_000, '2026-10-02');
    await logTransfer(1, 2, 20_000, '2026-10-05');

    expect(await getAccountBalance(1, '2026-09-30')).toBe(150_000);
    expect(await getAccountBalance(1, '2026-10-31')).toBe(200_000);
    expect(await getAccountBalance(1)).toBe(200_000);
  });

  it('starts from the latest balance check made by that date, and ignores later ones', async () => {
    await income(100_000, '2026-09-10');
    await confirmBalance(1, 80_000, '2026-09-20');
    await income(10_000, '2026-09-25');
    await confirmBalance(1, 500_000, '2026-10-10');

    expect(await getAccountBalance(1, '2026-09-30')).toBe(90_000);
    expect(await getAccountBalance(1, '2026-10-31')).toBe(500_000);
  });
});
