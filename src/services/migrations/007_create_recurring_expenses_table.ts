import type { Migration } from '@/services/database';

/**
 * Creates the `recurring_expenses` table: one row per registered recurring
 * bill. `frequency` is a closed enum guarded by a CHECK constraint; the
 * auto-logger inserts an expense and advances `next_due_date` by one period
 * each time the due date is reached. The index backs the auto-log query
 * (`WHERE is_active = 1 AND next_due_date <= ?`).
 */
export const migration: Migration = {
  id: 7,
  name: '007_create_recurring_expenses_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS recurring_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        amount INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        subcategory_id INTEGER REFERENCES categories(id),
        frequency TEXT NOT NULL CHECK(frequency IN ('monthly','weekly')),
        next_due_date TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_recurring_active_due
        ON recurring_expenses(is_active, next_due_date)`,
    );
  },
};
