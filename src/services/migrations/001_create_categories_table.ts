import { DEFAULT_CATEGORIES } from '@/constants/categories';
import type { Migration } from '@/services/database';

/**
 * Creates the `categories` table and seeds the default category tree. Parents
 * and subcategories share this table; a subcategory is any row whose
 * `parent_id` references its parent. Seeding here (atomic with table creation,
 * tracked by the migration ledger) avoids a separate first-launch seed check.
 */
export const migration: Migration = {
  id: 1,
  name: '001_create_categories_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER REFERENCES categories(id),
        is_default INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
    );

    for (let parentOrder = 0; parentOrder < DEFAULT_CATEGORIES.length; parentOrder += 1) {
      const parent = DEFAULT_CATEGORIES[parentOrder];
      await db.execute(
        'INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES (?, NULL, 1, ?)',
        [parent.name, parentOrder],
      );
      const [{ id: parentId }] = await db.query<{ id: number }>(
        'SELECT last_insert_rowid() AS id',
      );

      for (let subOrder = 0; subOrder < parent.subcategories.length; subOrder += 1) {
        await db.execute(
          'INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES (?, ?, 1, ?)',
          [parent.subcategories[subOrder], parentId, subOrder],
        );
      }
    }
  },
};
