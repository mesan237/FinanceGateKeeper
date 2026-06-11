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

function columns(table: string): string[] {
  return (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (r) => r.name,
  );
}

describe('migration 021 — accounts & transfers join cloud sync', () => {
  it('adds sync columns to accounts and transfers', () => {
    for (const table of ['accounts', 'transfers']) {
      const cols = columns(table);
      expect(cols).toContain('uuid');
      expect(cols).toContain('updated_at');
      expect(cols).toContain('sync_status');
    }
  });

  it('backfills the seeded accounts with a uuid and marks them pending', () => {
    const rows = sqlite
      .prepare('SELECT uuid, sync_status FROM accounts')
      .all() as { uuid: string | null; sync_status: string }[];
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.uuid).toBeTruthy();
      expect(row.sync_status).toBe('pending');
    }
  });

  it('stamps a uuid and marks pending when a transfer is inserted', () => {
    sqlite
      .prepare(
        `INSERT INTO transfers (from_account_id, to_account_id, amount, date, created_at)
         VALUES (1, 2, 5000, '2026-06-10', '2026-06-10T00:00:00Z')`,
      )
      .run();
    const row = sqlite
      .prepare('SELECT uuid, sync_status FROM transfers')
      .get() as { uuid: string | null; sync_status: string };
    expect(row.uuid).toBeTruthy();
    expect(row.sync_status).toBe('pending');
  });

  it('re-marks an expense pending when only its account_id changes (recreated trigger)', () => {
    sqlite
      .prepare(
        `INSERT INTO expenses (amount, category_id, date, is_recurring, created_at)
         VALUES (1000, 1, '2026-06-10', 0, '2026-06-10T00:00:00Z')`,
      )
      .run();
    // settle the row as synced with an old timestamp (a sync-only write must not re-arm it)
    sqlite
      .prepare(`UPDATE expenses SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
      .run();

    sqlite.prepare('UPDATE expenses SET account_id = 1').run();

    const row = sqlite
      .prepare('SELECT updated_at, sync_status FROM expenses')
      .get() as { updated_at: string; sync_status: string };
    expect(row.sync_status).toBe('pending');
    expect(row.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
});
