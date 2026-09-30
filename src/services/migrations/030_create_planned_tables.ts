import type { Migration } from '@/services/database';

/**
 * Creates the planned-purchases tables (VS-36): named shopping lists and the
 * items on them.
 *
 * There is deliberately no `status` column. An item is bought exactly when its
 * `expense_id` points at an existing expense, so the state can never drift from
 * the expense table. `ON DELETE SET NULL` reopens an item when its expense is
 * deleted elsewhere; `ON DELETE CASCADE` removes a list's items with the list
 * (the expenses those items created stay — they are real spending).
 *
 * `estimated_amount` is whole FCFA and strictly positive, like every expense.
 * `category_id` is required because buying the item must create an expense, and
 * an expense needs a category.
 */
export const migration: Migration = {
  id: 30,
  name: '030_create_planned_tables',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS planned_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      `CREATE TABLE IF NOT EXISTS planned_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL REFERENCES planned_lists(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        estimated_amount INTEGER NOT NULL CHECK(estimated_amount > 0),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        account_id INTEGER REFERENCES accounts(id),
        planned_date TEXT,
        expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_planned_items_list ON planned_items(list_id)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_planned_items_expense ON planned_items(expense_id)',
    );
  },
};
