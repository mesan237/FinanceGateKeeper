import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

let sqlite: Database.Database;
let driver: SqliteDriver;

beforeEach(() => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
});

afterEach(() => {
  sqlite.close();
});

/** The column list each update trigger watches, read back from its SQL. */
function watchedColumns(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const table of SYNCED_TABLES) {
    const row = sqlite
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = ?`)
      .get(`trg_${table}_upd`) as { sql: string };
    out[table] = /AFTER UPDATE OF (.+?) ON/s.exec(row.sql)![1];
  }
  return out;
}

describe('migration 035 — edits saved during a sync still sync', () => {
  it('keeps every update trigger watching the same columns as before', async () => {
    await runMigrations(driver, migrations.filter((m) => m.id < 35));
    const before = watchedColumns();

    await runMigrations(driver, migrations);

    expect(watchedColumns()).toEqual(before);
  });

  it('marks a user edit pending even with the old sync guard raised', async () => {
    await runMigrations(driver, migrations);
    sqlite
      .prepare(
        `INSERT INTO planned_lists (name, created_at, uuid, updated_at, sync_status)
         VALUES ('Market', '2026-10-01T00:00:00Z', 'l1', '2000-01-01T00:00:00.000Z', 'synced')`,
      )
      .run();
    sqlite.prepare('UPDATE _sync_guard SET active = 1 WHERE id = 1').run();

    sqlite.prepare(`UPDATE planned_lists SET name = 'Groceries'`).run();

    const row = sqlite.prepare('SELECT updated_at, sync_status FROM planned_lists').get() as {
      updated_at: string;
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
    expect(row.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('leaves a write that sets updated_at itself (a pull) alone', async () => {
    await runMigrations(driver, migrations);
    sqlite
      .prepare(
        `INSERT INTO planned_lists (name, created_at, uuid, updated_at, sync_status)
         VALUES ('Market', '2026-10-01T00:00:00Z', 'l1', '2000-01-01T00:00:00.000Z', 'synced')`,
      )
      .run();

    sqlite
      .prepare(`UPDATE planned_lists SET name = 'Cloud', updated_at = '2026-10-02T00:00:00.000Z'`)
      .run();

    const row = sqlite.prepare('SELECT updated_at, sync_status FROM planned_lists').get() as {
      updated_at: string;
      sync_status: string;
    };
    expect(row).toEqual({ updated_at: '2026-10-02T00:00:00.000Z', sync_status: 'synced' });
  });
});
