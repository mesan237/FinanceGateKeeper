import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import { exportData, importData } from '@/services/dataTransfer.service';
import { ImportValidationError, type ExportPayload } from '@/services/dataTransfer.types';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

interface Db {
  sqlite: Database.Database;
  driver: SqliteDriver;
}

function makeDb(): Db {
  const sqlite = new Database(':memory:');
  const driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  return { sqlite, driver };
}

function use(db: Db): void {
  mockState.driver = db.driver;
}

let source: Db;
let target: Db;

beforeEach(async () => {
  source = makeDb();
  await runMigrations(source.driver, migrations);
  target = makeDb();
  await runMigrations(target.driver, migrations);
});

afterEach(() => {
  source.sqlite.close();
  target.sqlite.close();
});

async function firstSubcategoryId(db: Db): Promise<number> {
  const [row] = await db.driver.query<{ id: number }>(
    `SELECT id FROM categories WHERE is_default = 1 AND parent_id IS NOT NULL LIMIT 1`,
  );
  return row.id;
}

describe('exportData', () => {
  it('dumps every SYNCED_TABLES row and excludes users', async () => {
    use(source);
    const categoryId = await firstSubcategoryId(source);
    await source.driver.execute(
      `INSERT INTO expenses (amount, category_id, date, created_at) VALUES (1000, ?, '2026-07-01', '2026-07-01T00:00:00.000Z')`,
      [categoryId],
    );

    const payload = await exportData();

    expect(Object.keys(payload.tables).sort()).toEqual([...SYNCED_TABLES].sort());
    expect(payload.tables).not.toHaveProperty('users');
    expect(payload.tables.expenses).toHaveLength(1);
    expect(payload.tables.categories!.length).toBeGreaterThan(0);
    expect(payload.version).toBe(1);
  });
});

describe('importData', () => {
  it('round-trips row counts and FK relationships onto a different database', async () => {
    use(source);
    const categoryId = await firstSubcategoryId(source);
    const [category] = await source.driver.query<{ name: string }>(
      `SELECT name FROM categories WHERE id = ?`,
      [categoryId],
    );
    await source.driver.execute(
      `INSERT INTO expenses (amount, category_id, date, created_at) VALUES (2500, ?, '2026-07-01', '2026-07-01T00:00:00.000Z')`,
      [categoryId],
    );
    const payload = await exportData();

    use(target);
    const summary = await importData(payload);

    expect(summary.expenses).toBe(1);

    const [restored] = await target.driver.query<{ amount: number; category_id: number }>(
      `SELECT amount, category_id FROM expenses`,
    );
    expect(restored.amount).toBe(2500);

    const [restoredCategory] = await target.driver.query<{ name: string }>(
      `SELECT name FROM categories WHERE id = ?`,
      [restored.category_id],
    );
    expect(restoredCategory.name).toBe(category.name);

    for (const table of SYNCED_TABLES) {
      const [{ n: sourceCount }] = await source.driver.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${table}`,
      );
      const [{ n: targetCount }] = await target.driver.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${table}`,
      );
      expect(targetCount).toBe(sourceCount);
    }
  });

  it('rejects an unsupported version and leaves existing data untouched', async () => {
    use(target);
    const [{ n: before }] = await target.driver.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM categories`,
    );

    const badPayload = { version: 2, exportedAt: '', tables: {} } as unknown as ExportPayload;
    await expect(importData(badPayload)).rejects.toThrow(ImportValidationError);

    const [{ n: after }] = await target.driver.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM categories`,
    );
    expect(after).toBe(before);
  });

  it('rejects a table name outside SYNCED_TABLES', async () => {
    use(target);
    const badPayload = {
      version: 1,
      exportedAt: '',
      tables: { not_a_real_table: [] },
    } as unknown as ExportPayload;
    await expect(importData(badPayload)).rejects.toThrow(ImportValidationError);
  });

  it('never lets a post-import insert collide with a restored id', async () => {
    use(source);
    const categoryId = await firstSubcategoryId(source);
    for (let i = 0; i < 3; i += 1) {
      await source.driver.execute(
        `INSERT INTO expenses (amount, category_id, date, created_at) VALUES (?, ?, '2026-07-01', '2026-07-01T00:00:00.000Z')`,
        [1000 + i, categoryId],
      );
    }
    const payload = await exportData();
    const maxSourceId = Math.max(...payload.tables.expenses!.map((r) => r.id as number));

    use(target);
    await importData(payload);
    await target.driver.execute(
      `INSERT INTO expenses (amount, category_id, date, created_at) VALUES (9999, ?, '2026-07-02', '2026-07-02T00:00:00.000Z')`,
      [categoryId],
    );
    const [{ id: newId }] = await target.driver.query<{ id: number }>(
      `SELECT id FROM expenses WHERE amount = 9999`,
    );
    expect(newId).toBeGreaterThan(maxSourceId);
  });

  it('rolls back every table when a row fails partway through the restore', async () => {
    use(target);
    const [{ n: accountsBefore }] = await target.driver.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM accounts`,
    );
    expect(accountsBefore).toBeGreaterThan(0);

    const categoryId = await firstSubcategoryId(target);
    // `accounts` (deleted, never re-inserted since it's absent from `tables`)
    // sits before `expenses` in SYNCED_TABLES order; the `expenses` row below
    // omits the NOT NULL `amount` column, so its insert throws. Without a
    // transaction, `accounts` would be left permanently empty.
    const badPayload = {
      version: 1,
      exportedAt: '2026-07-08T00:00:00.000Z',
      tables: {
        expenses: [{ category_id: categoryId, date: '2026-07-01', created_at: '2026-07-01T00:00:00.000Z' }],
      },
    } as unknown as ExportPayload;

    await expect(importData(badPayload)).rejects.toThrow();

    const [{ n: accountsAfter }] = await target.driver.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM accounts`,
    );
    expect(accountsAfter).toBe(accountsBefore);
  });
});
