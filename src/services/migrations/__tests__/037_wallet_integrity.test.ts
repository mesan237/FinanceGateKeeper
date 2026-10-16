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
});

afterEach(() => {
  sqlite.close();
});

function settle(table: string): void {
  sqlite
    .prepare(`UPDATE ${table} SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
    .run();
}

function syncStatus(table: string): string {
  return (sqlite.prepare(`SELECT sync_status FROM ${table} LIMIT 1`).get() as { sync_status: string })
    .sync_status;
}

describe('migration 037 — wallets on templates, balance checks', () => {
  it('lets a quick-add template carry a wallet, and syncs a wallet change', () => {
    sqlite
      .prepare(
        `INSERT INTO quick_add_templates (label, amount, category_id, sort_order, created_at)
         VALUES ('Taxi', 500, 1, 0, '2026-10-01T00:00:00Z')`,
      )
      .run();
    settle('quick_add_templates');

    sqlite.prepare('UPDATE quick_add_templates SET account_id = 2').run();

    expect(syncStatus('quick_add_templates')).toBe('pending');
  });

  it('lets a recurring expense carry a wallet, and syncs a wallet change', () => {
    sqlite
      .prepare(
        `INSERT INTO recurring_expenses (label, amount, category_id, frequency, next_due_date, created_at)
         VALUES ('Rent', 100000, 1, 'monthly', '2026-11-01', '2026-10-01T00:00:00Z')`,
      )
      .run();
    settle('recurring_expenses');

    sqlite.prepare('UPDATE recurring_expenses SET account_id = 2').run();

    expect(syncStatus('recurring_expenses')).toBe('pending');
  });

  it('creates balance checks with a cloud key, marked pending on insert', () => {
    sqlite
      .prepare(
        `INSERT INTO balance_checks (account_id, balance, difference, date, created_at)
         VALUES (1, 43500, -1500, '2026-10-15', '2026-10-15T08:00:00Z')`,
      )
      .run();

    const row = sqlite.prepare('SELECT uuid, sync_status FROM balance_checks').get() as {
      uuid: string | null;
      sync_status: string;
    };
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
  });

  it('marks a soft-deleted balance check pending so the removal syncs', () => {
    sqlite
      .prepare(
        `INSERT INTO balance_checks (account_id, balance, difference, date, created_at)
         VALUES (1, 43500, 0, '2026-10-15', '2026-10-15T08:00:00Z')`,
      )
      .run();
    settle('balance_checks');

    sqlite.prepare(`UPDATE balance_checks SET deleted_at = '2026-10-16T00:00:00Z'`).run();

    expect(syncStatus('balance_checks')).toBe('pending');
  });
});
