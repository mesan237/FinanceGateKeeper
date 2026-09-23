import type { Migration } from '@/services/database';

export const migration: Migration = {
  id: 3,
  name: '003_create_categories_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
        is_default INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        UNIQUE (name, parent_id)
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)',
    );
  },
};
