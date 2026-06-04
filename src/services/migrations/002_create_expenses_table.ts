import type { Migration } from '@/services/database';

/**
 * Creates the `expenses` table plus indexes on the columns the transaction
 * list filters by (`date` for ranges, `category_id` for category filtering).
 * Amounts are integers (FCFA has no decimals); `is_recurring` exists for VS-07
 * but every VS-03 expense is non-recurring.
 */
export const migration: Migration = {
  id: 2,
  name: '002_create_expenses_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        subcategory_id INTEGER REFERENCES categories(id),
        note TEXT,
        date TEXT NOT NULL,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id)',
    );
  },
};
