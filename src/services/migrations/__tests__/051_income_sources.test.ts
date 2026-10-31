import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';
import { SEED_INCOME_SOURCES } from '@/services/migrations/051_income_sources';

let sqlite: Database.Database;
let driver: SqliteDriver;

async function migrateTo(lastId: number): Promise<void> {
  await runMigrations(driver, migrations.filter((m) => m.id <= lastId));
}

beforeEach(() => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
});

afterEach(() => {
  sqlite.close();
});

type SourceRow = { id: number; key: string | null; name: string; parent_id: number | null; uuid: string };

function insertLegacyIncome(source: string, syncStatus = 'synced'): void {
  sqlite
    .prepare(
      `INSERT INTO income (amount, source, note, date, created_at, uuid, updated_at, sync_status, account_id)
       VALUES (5000, ?, 'n', '2026-10-01', '2026-10-01T08:00:00Z', ?, '2026-10-01T08:00:00Z', ?, 1)`,
    )
    .run(source, `u-${source}`, syncStatus);
}

describe('migration 051 — income sources (VS-91)', () => {
  it('seeds the built-in sources with fixed ids and uuids, e-commerce under business', async () => {
    await runMigrations(driver, migrations);

    const rows = sqlite.prepare('SELECT id, key, name, parent_id, uuid FROM income_sources ORDER BY id').all() as SourceRow[];
    expect(rows.map((r) => [r.id, r.key, r.parent_id])).toEqual([
      [1, 'salary', null],
      [2, 'freelance', null],
      [3, 'business', null],
      [4, 'gift', null],
      [5, 'other', null],
      [6, 'ecommerce', 3],
    ]);
    expect(rows.map((r) => r.uuid)).toEqual(SEED_INCOME_SOURCES.map((s) => `seed-income-source-${s.key}`));
  });

  it('moves every income row to its source id, keeping ids, cloud keys and sync state', async () => {
    await migrateTo(50);
    insertLegacyIncome('salary');
    insertLegacyIncome('freelance', 'pending');
    insertLegacyIncome('ecommerce');
    await migrateTo(51);

    const rows = sqlite
      .prepare('SELECT id, source_id, uuid, sync_status, account_id, note FROM income ORDER BY id')
      .all() as { id: number; source_id: number; uuid: string; sync_status: string; account_id: number; note: string }[];
    expect(rows).toEqual([
      { id: 1, source_id: 1, uuid: 'u-salary', sync_status: 'synced', account_id: 1, note: 'n' },
      { id: 2, source_id: 2, uuid: 'u-freelance', sync_status: 'pending', account_id: 1, note: 'n' },
      { id: 3, source_id: 6, uuid: 'u-ecommerce', sync_status: 'synced', account_id: 1, note: 'n' },
    ]);
    const cols = (sqlite.prepare('PRAGMA table_info(income)').all() as { name: string }[]).map((c) => c.name);
    expect(cols).not.toContain('source');
  });

  it('marks an income row pending again when its source changes', async () => {
    await migrateTo(50);
    insertLegacyIncome('salary');
    await migrateTo(51);

    sqlite.prepare('UPDATE income SET source_id = 4 WHERE id = 1').run();

    const row = sqlite.prepare('SELECT sync_status FROM income WHERE id = 1').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });

  it('stamps a new income row and a new custom source for sync', async () => {
    await runMigrations(driver, migrations);
    sqlite
      .prepare("INSERT INTO income_sources (name, parent_id, created_at) VALUES ('Rent from shop', 3, '2026-10-31')")
      .run();
    sqlite
      .prepare("INSERT INTO income (amount, source_id, date, created_at) VALUES (100, 7, '2026-10-31', '2026-10-31')")
      .run();

    const source = sqlite.prepare('SELECT uuid, sync_status FROM income_sources WHERE id = 7').get() as {
      uuid: string | null;
      sync_status: string;
    };
    const income = sqlite.prepare('SELECT uuid, sync_status FROM income').get() as typeof source;
    expect(source.uuid).not.toBeNull();
    expect(source.sync_status).toBe('pending');
    expect(income.uuid).not.toBeNull();
    expect(income.sync_status).toBe('pending');
  });

  it('leaves the built-in sources unsynced, so nothing is pushed until one changes', async () => {
    await runMigrations(driver, migrations);

    const pending = sqlite.prepare("SELECT COUNT(*) AS c FROM income_sources WHERE sync_status = 'pending'").get() as {
      c: number;
    };
    expect(pending.c).toBe(0);
  });

  it('rejects an income row whose source does not exist', async () => {
    await runMigrations(driver, migrations);
    sqlite.pragma('foreign_keys = ON');

    expect(() =>
      sqlite
        .prepare("INSERT INTO income (amount, source_id, date, created_at) VALUES (100, 99, '2026-10-31', '2026-10-31')")
        .run(),
    ).toThrow();
  });

  it('syncs income sources before income', () => {
    expect(SYNCED_TABLES.indexOf('income_sources')).toBeGreaterThanOrEqual(0);
    expect(SYNCED_TABLES.indexOf('income_sources')).toBeLessThan(SYNCED_TABLES.indexOf('income'));
  });
});
