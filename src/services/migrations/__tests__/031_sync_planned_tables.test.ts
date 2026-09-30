import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

let sqlite: Database.Database;
let driver: SqliteDriver;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(driver, migrations);
});

afterEach(() => {
  sqlite.close();
});

async function columnsOf(table: string): Promise<string[]> {
  const info = await driver.query<{ name: string }>(`PRAGMA table_info(${table})`);
  return info.map((c) => c.name);
}

async function addListWithItem(): Promise<void> {
  await driver.execute(
    `INSERT INTO planned_lists (name, created_at) VALUES ('Market', '2026-10-01T00:00:00Z')`,
  );
  await driver.execute(
    `INSERT INTO planned_items (list_id, name, estimated_amount, category_id, created_at)
     VALUES (1, 'Rice', 5000, 1, '2026-10-01T00:00:00Z')`,
  );
}

describe('migration 031 — planned purchases sync wiring', () => {
  it('lists both tables as synced, after everything they reference', () => {
    const order: string[] = [...SYNCED_TABLES];
    expect(order).toEqual(expect.arrayContaining(['planned_lists', 'planned_items']));
    expect(order.indexOf('planned_items')).toBeGreaterThan(order.indexOf('planned_lists'));
    for (const parent of ['categories', 'accounts', 'expenses']) {
      expect(order.indexOf('planned_items')).toBeGreaterThan(order.indexOf(parent));
    }
  });

  it('provisions the sync metadata columns on both tables', async () => {
    for (const table of ['planned_lists', 'planned_items'] as const) {
      expect(await columnsOf(table)).toEqual(
        expect.arrayContaining(['uuid', 'updated_at', 'sync_status']),
      );
    }
  });

  it('stamps a uuid and marks new rows pending', async () => {
    await addListWithItem();

    for (const table of ['planned_lists', 'planned_items'] as const) {
      const [row] = await driver.query<{ uuid: string | null; sync_status: string }>(
        `SELECT uuid, sync_status FROM ${table}`,
      );
      expect(row.uuid).toEqual(expect.any(String));
      expect(row.sync_status).toBe('pending');
    }
  });

  it('marks an item pending again when its estimate changes', async () => {
    await addListWithItem();
    await driver.execute(`UPDATE planned_items SET sync_status = 'synced'`);

    await driver.execute(`UPDATE planned_items SET estimated_amount = 5500`);

    const [row] = await driver.query<{ sync_status: string }>(
      'SELECT sync_status FROM planned_items',
    );
    expect(row.sync_status).toBe('pending');
  });

  it('marks an item pending when it is linked to an expense', async () => {
    await addListWithItem();
    await driver.execute(
      `INSERT INTO expenses (amount, category_id, date, created_at)
       VALUES (4800, 1, '2026-10-03', '2026-10-03T00:00:00Z')`,
    );
    await driver.execute(`UPDATE planned_items SET sync_status = 'synced'`);

    await driver.execute(`UPDATE planned_items SET expense_id = 1`);

    const [row] = await driver.query<{ sync_status: string }>(
      'SELECT sync_status FROM planned_items',
    );
    expect(row.sync_status).toBe('pending');
  });

  it('marks an item pending when its expense is deleted, so the reopened state syncs', async () => {
    await addListWithItem();
    await driver.execute(
      `INSERT INTO expenses (amount, category_id, date, created_at)
       VALUES (4800, 1, '2026-10-03', '2026-10-03T00:00:00Z')`,
    );
    await driver.execute(`UPDATE planned_items SET expense_id = 1`);
    await driver.execute(`UPDATE planned_items SET sync_status = 'synced'`);

    await driver.execute(`DELETE FROM expenses WHERE id = 1`);

    const [row] = await driver.query<{ expense_id: number | null; sync_status: string }>(
      'SELECT expense_id, sync_status FROM planned_items',
    );
    expect(row.expense_id).toBeNull();
    expect(row.sync_status).toBe('pending');
  });

  it('is idempotent when run a second time', async () => {
    await expect(runMigrations(driver, migrations)).resolves.not.toThrow();
  });
});
