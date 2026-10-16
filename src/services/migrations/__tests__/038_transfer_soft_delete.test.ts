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
      `INSERT INTO transfers (from_account_id, to_account_id, amount, date, created_at)
       VALUES (1, 2, 5000, '2026-10-15', '2026-10-15T08:00:00Z')`,
    )
    .run();
  sqlite
    .prepare(`UPDATE transfers SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
    .run();
});

afterEach(() => {
  sqlite.close();
});

function syncStatus(): string {
  return (sqlite.prepare('SELECT sync_status FROM transfers').get() as { sync_status: string }).sync_status;
}

describe('migration 038 — transfers can be removed without vanishing from sync', () => {
  it('starts every transfer live', () => {
    const row = sqlite.prepare('SELECT deleted_at FROM transfers').get() as { deleted_at: string | null };
    expect(row.deleted_at).toBeNull();
  });

  it('marks a transfer pending when it is soft-deleted, so the removal reaches the cloud', () => {
    sqlite.prepare(`UPDATE transfers SET deleted_at = '2026-10-16T00:00:00Z'`).run();
    expect(syncStatus()).toBe('pending');
  });

  it('still marks a transfer pending when its amount is edited', () => {
    sqlite.prepare('UPDATE transfers SET amount = 6000').run();
    expect(syncStatus()).toBe('pending');
  });
});
