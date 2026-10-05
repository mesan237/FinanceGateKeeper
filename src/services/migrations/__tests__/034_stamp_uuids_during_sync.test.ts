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

const before034 = (): ReadonlyArray<(typeof migrations)[number]> =>
  migrations.filter((m) => m.id < 34);

function raiseGuard(): void {
  sqlite.prepare('UPDATE _sync_guard SET active = 1 WHERE id = 1').run();
}

function insertList(name: string): void {
  sqlite
    .prepare(`INSERT INTO planned_lists (name, created_at) VALUES (?, '2026-10-01T00:00:00Z')`)
    .run(name);
}

function listRow(name: string): { uuid: string | null; updated_at: string | null; sync_status: string } {
  return sqlite
    .prepare('SELECT uuid, updated_at, sync_status FROM planned_lists WHERE name = ?')
    .get(name) as { uuid: string | null; updated_at: string | null; sync_status: string };
}

describe('migration 034 — uuids are stamped even while a sync is running', () => {
  it('gives a row created during a pull its uuid', async () => {
    await runMigrations(driver, migrations);
    raiseGuard();

    insertList('Market');

    const row = listRow('Market');
    expect(row.uuid).toMatch(/^[0-9a-f]{32}$/);
    expect(row.updated_at).toBeTruthy();
    expect(row.sync_status).toBe('pending');
  });

  it('keeps the uuid a synced row arrives with', async () => {
    await runMigrations(driver, migrations);
    raiseGuard();

    sqlite
      .prepare(
        `INSERT INTO planned_lists (name, created_at, uuid, updated_at, sync_status)
         VALUES ('Cloud', '2026-10-01T00:00:00Z', 'cloud-uuid', '2026-10-01T00:00:00.000Z', 'synced')`,
      )
      .run();

    const row = listRow('Cloud');
    expect(row.uuid).toBe('cloud-uuid');
    expect(row.updated_at).toBe('2026-10-01T00:00:00.000Z');
    expect(row.sync_status).toBe('synced');
  });

  it('repairs rows already saved without a uuid, in every synced table', async () => {
    await runMigrations(driver, before034());
    // The old trigger skipped while the guard was up; dropping it reproduces that.
    sqlite.prepare('DROP TRIGGER trg_planned_lists_ins').run();
    insertList('Orphan');
    expect(listRow('Orphan').uuid).toBeNull();

    await runMigrations(driver, migrations);

    const row = listRow('Orphan');
    expect(row.uuid).toMatch(/^[0-9a-f]{32}$/);
    expect(row.sync_status).toBe('pending');
    for (const table of SYNCED_TABLES) {
      const missing = sqlite
        .prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE uuid IS NULL`)
        .get() as { c: number };
      expect(missing.c).toBe(0);
    }
  });

  it('lowers a guard a killed sync left raised', async () => {
    await runMigrations(driver, before034());
    raiseGuard();

    await runMigrations(driver, migrations);

    const guard = sqlite.prepare('SELECT active FROM _sync_guard WHERE id = 1').get() as {
      active: number;
    };
    expect(guard.active).toBe(0);
  });
});
