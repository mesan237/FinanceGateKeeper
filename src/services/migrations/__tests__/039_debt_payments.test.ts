import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  const driver: SqliteDriver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(driver, migrations);
  sqlite
    .prepare(
      `INSERT INTO debts (person_name, amount, direction, date, status, created_at)
       VALUES ('Marie', 50000, 'lent', '2026-10-01', 'pending', '2026-10-01T08:00:00Z')`,
    )
    .run();
});

afterEach(() => {
  sqlite.close();
});

function settle(table: string): void {
  sqlite
    .prepare(`UPDATE ${table} SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
    .run();
}

function status(table: string): string {
  return (sqlite.prepare(`SELECT sync_status FROM ${table} LIMIT 1`).get() as { sync_status: string })
    .sync_status;
}

describe('migration 039 — debts that move money', () => {
  it('lets a debt name the wallet the loan went through, and syncs a change to it', () => {
    settle('debts');
    sqlite.prepare('UPDATE debts SET account_id = 2').run();
    expect(status('debts')).toBe('pending');
  });

  it('soft-deletes a debt so the removal syncs', () => {
    settle('debts');
    sqlite.prepare(`UPDATE debts SET deleted_at = '2026-10-16T00:00:00Z'`).run();
    expect(status('debts')).toBe('pending');
  });

  it('records repayments with a cloud key, marked pending on insert', () => {
    sqlite
      .prepare(
        `INSERT INTO debt_payments (debt_id, amount, account_id, date, created_at)
         VALUES (1, 20000, 2, '2026-10-10', '2026-10-10T08:00:00Z')`,
      )
      .run();
    const row = sqlite.prepare('SELECT uuid, sync_status FROM debt_payments').get() as {
      uuid: string | null;
      sync_status: string;
    };
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
  });

  it('rejects a repayment that is not positive', () => {
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO debt_payments (debt_id, amount, date, created_at)
           VALUES (1, 0, '2026-10-10', '2026-10-10T08:00:00Z')`,
        )
        .run(),
    ).toThrow();
  });
});
