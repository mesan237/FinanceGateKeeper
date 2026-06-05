import type { Migration } from '@/services/database';

/**
 * Creates the `zero_days` table: one row per calendar day the user explicitly
 * confirmed they spent nothing. The `UNIQUE(date)` constraint makes
 * `confirmZeroDay` idempotent (an `INSERT OR IGNORE` collapses repeat
 * confirmations of the same day to a single row), so a double-tap or a re-open
 * cannot create duplicates.
 */
export const migration: Migration = {
  id: 9,
  name: '009_create_zero_days_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS zero_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        confirmed_at TEXT NOT NULL
      )`,
    );
  },
};
