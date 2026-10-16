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
      `INSERT INTO expenses (amount, category_id, date, is_recurring, created_at)
       VALUES (20000, 1, '2026-10-01', 0, '2026-10-01T08:00:00Z')`,
    )
    .run();
});

afterEach(() => {
  sqlite.close();
});

describe('migration 040 — refunds linked to their expense', () => {
  it('leaves every existing expense unlinked', () => {
    const row = sqlite.prepare('SELECT refund_of FROM expenses').get() as { refund_of: number | null };
    expect(row.refund_of).toBeNull();
  });

  it('lets a refund row point at the expense it refunds, and marks a relink pending', () => {
    sqlite
      .prepare(
        `INSERT INTO expenses (amount, category_id, date, is_recurring, refund_of, created_at)
         VALUES (-5000, 1, '2026-10-05', 0, 1, '2026-10-05T08:00:00Z')`,
      )
      .run();
    sqlite
      .prepare(`UPDATE expenses SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
      .run();

    sqlite.prepare('UPDATE expenses SET refund_of = NULL WHERE id = 2').run();

    const row = sqlite.prepare('SELECT sync_status FROM expenses WHERE id = 2').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });
});
