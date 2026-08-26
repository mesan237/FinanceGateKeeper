import type { Migration } from '@/services/database';

/**
 * Creates the `category_budgets` table — the per-category envelope that
 * subdivides a month's spendable total (VS-33).
 *
 * `UNIQUE(month, category_id)` is what makes "set this category's budget" an
 * upsert rather than an append: one envelope per category per month, so
 * repeated edits during the month overwrite instead of accumulating rows.
 *
 * `allocated_amount` is whole FCFA (no decimals, matching every other amount
 * column). `rollover_enabled` is per-category opt-in: when set, the envelope's
 * unspent remainder — or its overspend — carries into the next month. The carry
 * itself is never stored; it is recomputed from history so that correcting a
 * past month propagates forward instead of leaving a stale balance behind.
 */
export const migration: Migration = {
  id: 26,
  name: '026_create_category_budgets_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS category_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        allocated_amount INTEGER NOT NULL,
        rollover_enabled INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE(month, category_id)
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_category_budgets_month ON category_budgets(month)',
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_category_budgets_category
         ON category_budgets(category_id)`,
    );
  },
};
