import type { Migration } from '@/services/database';

/**
 * Creates the `funds` table: exactly two rows in practice — one `emergency`
 * fund (mandatory target) and one `savings` fund (optional target, nullable).
 * `type` is a closed enum guarded by a CHECK constraint, and `UNIQUE(type)`
 * enforces the one-fund-per-type invariant `getOrCreateFunds` relies on for its
 * race-safe `INSERT OR IGNORE` seeding (mirrors `allocations.month`). Amounts
 * are integers (FCFA has no decimals); `is_target_met` is a 0/1 flag flipped
 * when `current_amount >= target_amount`.
 */
export const migration: Migration = {
  id: 10,
  name: '010_create_funds_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS funds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL UNIQUE CHECK(type IN ('emergency','savings')),
        target_amount INTEGER,
        current_amount INTEGER NOT NULL DEFAULT 0,
        is_target_met INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    );
  },
};
