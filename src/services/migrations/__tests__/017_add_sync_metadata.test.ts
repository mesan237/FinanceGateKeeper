import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

let sqlite: Database.Database;
let driver: SqliteDriver;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(
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

describe('migration 017 — sync metadata columns', () => {
  it('adds uuid, updated_at, sync_status to every synced table', () => {
    for (const table of SYNCED_TABLES) {
      const cols = columns(table);
      expect(cols).toContain('uuid');
      expect(cols).toContain('updated_at');
      expect(cols).toContain('sync_status');
    }
  });

  it('does NOT add sync columns to the excluded users table', () => {
    expect(columns('users')).not.toContain('sync_status');
  });
});

describe('migration 017 — insert trigger', () => {
  it('stamps updated_at, marks pending, and assigns a uuid on a local insert', () => {
    sqlite
      .prepare('INSERT INTO income (amount, source, date, created_at) VALUES (?,?,?,?)')
      .run(1000, 'salary', '2026-06-01', '2026-06-01T00:00:00.000Z');

    const row = sqlite.prepare('SELECT uuid, updated_at, sync_status FROM income').get() as {
      uuid: string | null;
      updated_at: string | null;
      sync_status: string;
    };

    expect(row.uuid).toBeTruthy();
    expect(row.updated_at).toBeTruthy();
    expect(row.sync_status).toBe('pending');
  });
});

describe('migration 017 — update trigger', () => {
  it('re-stamps updated_at and re-marks pending when a data column changes', () => {
    sqlite
      .prepare('INSERT INTO income (amount, source, date, created_at) VALUES (?,?,?,?)')
      .run(1000, 'salary', '2026-06-01', '2026-06-01T00:00:00.000Z');
    // settle the row with an old timestamp (sync-only write — must not trigger)
    sqlite
      .prepare(`UPDATE income SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
      .run();

    sqlite.prepare('UPDATE income SET amount = 2000').run();

    const row = sqlite.prepare('SELECT updated_at, sync_status FROM income').get() as {
      updated_at: string;
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
    expect(row.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('does NOT re-arm when only sync_status changes (no push/pull loop)', () => {
    sqlite
      .prepare('INSERT INTO income (amount, source, date, created_at) VALUES (?,?,?,?)')
      .run(1000, 'salary', '2026-06-01', '2026-06-01T00:00:00.000Z');
    sqlite
      .prepare(`UPDATE income SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'pending'`)
      .run();

    // marking synced is the push completion write — it must leave updated_at intact
    sqlite.prepare(`UPDATE income SET sync_status = 'synced'`).run();

    const row = sqlite.prepare('SELECT updated_at, sync_status FROM income').get() as {
      updated_at: string;
      sync_status: string;
    };
    expect(row.sync_status).toBe('synced');
    expect(row.updated_at).toBe('2000-01-01T00:00:00.000Z');
  });
});

describe('migration 017 — backfill', () => {
  it('assigns a unique uuid to every pre-existing (seeded category) row', () => {
    const stats = sqlite
      .prepare(
        `SELECT COUNT(*) AS total, COUNT(DISTINCT uuid) AS distinctUuids,
                SUM(CASE WHEN uuid IS NULL THEN 1 ELSE 0 END) AS nulls
         FROM categories`,
      )
      .get() as { total: number; distinctUuids: number; nulls: number };

    expect(stats.total).toBeGreaterThan(0);
    expect(stats.distinctUuids).toBe(stats.total);
    expect(stats.nulls).toBe(0);
  });
});
