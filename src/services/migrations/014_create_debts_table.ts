import type { Migration } from '@/services/database';

/**
 * Creates the `debts` table: the people ledger, one row per informal loan in
 * either direction. `direction` (lent | owed) and `status` (pending | settled)
 * are closed enums guarded by CHECK constraints; `due_date`, `note`, and
 * `settled_at` are nullable. Amounts are integers (FCFA, no decimals). The
 * composite index backs both the per-direction list and the outstanding-totals
 * query, which always filter on `(direction, status)`.
 */
export const migration: Migration = {
  id: 14,
  name: '014_create_debts_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('lent','owed')),
        date TEXT NOT NULL,
        due_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','settled')),
        note TEXT,
        settled_at TEXT,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_debts_direction_status ON debts(direction, status)',
    );
  },
};
