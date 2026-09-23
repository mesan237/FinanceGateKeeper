import Database from 'better-sqlite3';

import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { createBetterSqliteDriver, runMigrations } from '@/services/database';
import { migrations } from '@/services/migrations';

function freshDriver() {
  const sqlite = new Database(':memory:');
  return { sqlite, driver: createBetterSqliteDriver(sqlite) };
}

describe('migration 003_create_categories_table', () => {
  it('creates a categories table with the expected columns', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const cols = await driver.query<{ name: string }>(
      "PRAGMA table_info('categories')",
    );
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(['id', 'is_default', 'name', 'parent_id', 'sort_order']);
    sqlite.close();
  });

  it('records migration 3 in the _migrations table', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const rows = await driver.query<{ id: number; name: string }>(
      'SELECT id, name FROM _migrations WHERE id = 3',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('003_create_categories_table');
    sqlite.close();
  });
});

describe('migration 004_create_expenses_table', () => {
  it('creates an expenses table with the expected columns', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const cols = await driver.query<{ name: string }>(
      "PRAGMA table_info('expenses')",
    );
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual([
      'amount',
      'category_id',
      'created_at',
      'date',
      'id',
      'is_recurring',
      'note',
      'subcategory_id',
    ]);
    sqlite.close();
  });

  it('rejects an insert with amount = 0', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const categories = await driver.query<{ id: number }>(
      'SELECT id FROM categories LIMIT 1',
    );
    const categoryId = categories[0].id;

    await expect(
      driver.execute(
        `INSERT INTO expenses (amount, category_id, date, is_recurring, created_at)
         VALUES (0, ?, '2026-05-30', 0, '2026-05-30T10:00:00Z')`,
        [categoryId],
      ),
    ).rejects.toThrow();
    sqlite.close();
  });

  it('accepts a valid insert', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const categories = await driver.query<{ id: number }>(
      'SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1',
    );
    const categoryId = categories[0].id;

    await driver.execute(
      `INSERT INTO expenses (amount, category_id, date, is_recurring, created_at)
       VALUES (1500, ?, '2026-05-30', 0, '2026-05-30T10:00:00Z')`,
      [categoryId],
    );

    const rows = await driver.query<{ amount: number }>(
      'SELECT amount FROM expenses',
    );
    expect(rows).toEqual([{ amount: 1500 }]);
    sqlite.close();
  });
});

describe('migration 005_seed_default_categories', () => {
  it('seeds exactly the eight default top-level categories', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const parents = await driver.query<{ name: string; sort_order: number }>(
      'SELECT name, sort_order FROM categories WHERE parent_id IS NULL ORDER BY sort_order',
    );
    expect(parents.map((p) => p.name)).toEqual(
      DEFAULT_CATEGORIES.map((c) => c.name),
    );
  });

  it('seeds each default category with the expected number of children', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    for (const seed of DEFAULT_CATEGORIES) {
      const rows = await driver.query<{ count: number }>(
        `SELECT COUNT(*) AS count FROM categories
         WHERE parent_id = (SELECT id FROM categories WHERE name = ? AND parent_id IS NULL)`,
        [seed.name],
      );
      expect(rows[0].count).toBe(seed.children.length);
    }
    sqlite.close();
  });

  it('does not duplicate seed rows on a second migration run', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);
    await runMigrations(driver, migrations);

    const rows = await driver.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM categories WHERE is_default = 1',
    );
    const expected =
      DEFAULT_CATEGORIES.length +
      DEFAULT_CATEGORIES.reduce((sum, c) => sum + c.children.length, 0);
    expect(rows[0].count).toBe(expected);
    sqlite.close();
  });
});
