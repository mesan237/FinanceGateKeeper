import type { Migration } from '@/services/database';

/**
 * Creates the `income` table. Unlike expenses, income carries no category tree —
 * just a flat `source` tag constrained to the closed enum in
 * `@/constants/incomeSources` (salary | freelance | ecommerce). Amounts are
 * integers (FCFA has no decimals). The index on `date` backs the
 * `getMonthlyTotal` query, which filters with `date LIKE 'YYYY-MM-%'`.
 */
export const migration: Migration = {
  id: 4,
  name: '004_create_income_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('salary', 'freelance', 'ecommerce')),
        note TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_income_date ON income(date)');
  },
};
