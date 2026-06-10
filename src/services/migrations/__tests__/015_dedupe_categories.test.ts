import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { migration as dedupeCategories } from '@/services/migrations/015_dedupe_categories';

// Everything before the dedupe migration — run these to build the schema, then
// inject duplicates, then run 015 by itself to exercise the heal.
const PRIOR_MIGRATIONS = migrations.filter((m) => m.id < dedupeCategories.id);

function freshDriver(): { sqlite: Database.Database; driver: SqliteDriver } {
  const sqlite = new Database(':memory:');
  // better-sqlite3's bind-param types are stricter than the driver's structural
  // shape; the cast bridges that gap without loosening to `any` (mirrors the
  // expenses service test).
  const driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  return { sqlite, driver };
}

async function categoryNames(driver: SqliteDriver, parentId: number | null): Promise<string[]> {
  const rows = await driver.query<{ name: string }>(
    parentId === null
      ? 'SELECT name FROM categories WHERE parent_id IS NULL ORDER BY id'
      : `SELECT name FROM categories WHERE parent_id = ${parentId} ORDER BY id`,
  );
  return rows.map((r) => r.name);
}

describe('015_dedupe_categories', () => {
  let sqlite: Database.Database;
  let driver: SqliteDriver;

  beforeEach(async () => {
    ({ sqlite, driver } = freshDriver());
    await runMigrations(driver, PRIOR_MIGRATIONS);
  });

  afterEach(() => sqlite.close());

  it('collapses duplicate parents and their children onto the lowest id', async () => {
    // Seed 001 already inserted Food (id 1) + its three children. Simulate a
    // second un-guarded seed pass: a duplicate Food parent with its own copies.
    await driver.execute(
      "INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES ('Food', NULL, 1, 0)",
    );
    const [{ id: dupFood }] = await driver.query<{ id: number }>(
      'SELECT last_insert_rowid() AS id',
    );
    await driver.execute(
      `INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES ('Groceries', ${dupFood}, 1, 0)`,
    );

    await dedupeCategories.up(driver);

    expect(await categoryNames(driver, null)).toEqual([
      'Food',
      'Transport',
      'Bills',
      'Health',
      'Entertainment',
      'Education',
      'Shopping',
      'Other',
    ]);
    // Food's children are de-duplicated, not doubled.
    expect(await categoryNames(driver, 1)).toEqual(['Groceries', 'Restaurant', 'Snacks']);
    const [{ gone }] = await driver.query<{ gone: number }>(
      `SELECT COUNT(*) AS gone FROM categories WHERE id = ${dupFood}`,
    );
    expect(gone).toBe(0);
  });

  it('repoints expenses on a discarded duplicate at the surviving category', async () => {
    await driver.execute(
      "INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES ('Food', NULL, 1, 0)",
    );
    const [{ id: dupFood }] = await driver.query<{ id: number }>(
      'SELECT last_insert_rowid() AS id',
    );
    await driver.execute(
      `INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES ('Groceries', ${dupFood}, 1, 0)`,
    );
    const [{ id: dupGroceries }] = await driver.query<{ id: number }>(
      'SELECT last_insert_rowid() AS id',
    );
    await driver.execute(
      `INSERT INTO expenses (amount, category_id, subcategory_id, note, date, is_recurring, created_at)
       VALUES (2500, ${dupFood}, ${dupGroceries}, NULL, '2026-06-09', 0, '2026-06-09T00:00:00.000Z')`,
    );

    await dedupeCategories.up(driver);

    const [expense] = await driver.query<{ category_id: number; subcategory_id: number }>(
      'SELECT category_id, subcategory_id FROM expenses',
    );
    expect(expense.category_id).toBe(1); // surviving Food
    const survivingGroceries = await driver.query<{ id: number }>(
      'SELECT id FROM categories WHERE parent_id = 1 AND name = ?',
      ['Groceries'],
    );
    expect(survivingGroceries).toHaveLength(1);
    expect(expense.subcategory_id).toBe(survivingGroceries[0].id);
  });

  it('adds a UNIQUE index that rejects a later duplicate insert', async () => {
    await dedupeCategories.up(driver);

    expect(() =>
      sqlite
        .prepare("INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES ('Food', NULL, 1, 0)")
        .run(),
    ).toThrow();
  });

  it('is a no-op on an already-unique tree (full migration set runs clean)', async () => {
    const second = freshDriver();
    await expect(runMigrations(second.driver, migrations)).resolves.toBeUndefined();
    expect(await categoryNames(second.driver, null)).toHaveLength(8);
    second.sqlite.close();
  });
});
