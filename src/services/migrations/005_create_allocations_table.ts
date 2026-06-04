import type { Migration } from '@/services/database';

/**
 * Creates the `allocations` table: one row per `YYYY-MM` month carrying the
 * four bucket percentages, the user's preferred display order, and the lock
 * flag set once the user confirms the month. `UNIQUE(month)` enforces the
 * one-row-per-month invariant the service relies on for `INSERT OR IGNORE`
 * upserts. Percentages are integers (FCFA has no decimals; matches every
 * other amount column). `priority_order` is a JSON-stringified `Bucket[]`.
 */
export const migration: Migration = {
  id: 5,
  name: '005_create_allocations_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL UNIQUE,
        emergency_fund_pct INTEGER NOT NULL,
        savings_pct INTEGER NOT NULL,
        projects_pct INTEGER NOT NULL,
        expenses_pct INTEGER NOT NULL,
        priority_order TEXT NOT NULL,
        is_locked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_allocations_month ON allocations(month)',
    );
  },
};
