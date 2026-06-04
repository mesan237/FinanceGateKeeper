import type { Migration } from '@/services/database';

/**
 * Creates the `quick_add_templates` table: one row per one-tap shortcut
 * carrying a user label, amount (integer FCFA), and the category/subcategory
 * the logged expense inherits. `sort_order` keeps the grid stable; tiles are
 * appended after their siblings. The logged Expense row is the durable record,
 * so templates are hard-deleted (no soft-delete flag).
 */
export const migration: Migration = {
  id: 6,
  name: '006_create_quick_add_templates_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS quick_add_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        subcategory_id INTEGER REFERENCES categories(id),
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    );
  },
};
