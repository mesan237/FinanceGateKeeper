import type { Migration } from '@/services/database';

import { addSyncColumns } from '@/services/migrations/017_add_sync_metadata';

/**
 * Creates `goals` (VS-48): a starter buffer or a sinking fund, each linked to
 * the real wallet that holds its money.
 *
 * Progress is never stored. It is the linked wallet's live balance, so it
 * cannot drift from what the wallet actually holds — the flaw of the parked
 * funds design, whose deposits touched no wallet. Saving is a transfer into
 * the wallet. `monthly_amount` is what the user plans to set aside each month.
 * `target_date` is required for a sinking fund (checked in the service).
 *
 * Removal is a soft delete (`deleted_at`): the sync engine never sends
 * deletions, so a hard-deleted goal would come back on the next restore.
 */
export const migration: Migration = {
  id: 43,
  name: '043_goals',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('buffer','sinking')),
        target_amount INTEGER NOT NULL CHECK(target_amount > 0),
        target_date TEXT,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        monthly_amount INTEGER NOT NULL DEFAULT 0 CHECK(monthly_amount >= 0),
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_goals_account ON goals(account_id)');
    await addSyncColumns(db, 'goals');
  },
};
