import type { Migration } from '@/services/database';

import { addSyncColumns } from '@/services/migrations/017_add_sync_metadata';

/**
 * Creates `month_snapshots` (VS-53): each closed month's net worth, its parts,
 * and the month's income and spending (for the savings rate), stored once so
 * history stays put when an old entry is edited later.
 *
 * Append-only, like `baseline_facts`: the latest row per `month` wins. A
 * deliberate "recalculate" adds a fresh row rather than overwriting, and two
 * devices that both close the same month simply leave two rows — a UNIQUE on
 * `month` would make the second one's sync fail.
 *
 * Net worth = wallets + lent (still owed to the user) − owed (still owed by
 * the user) + tontines (paid in − received), each as of the month's last day.
 */
export const migration: Migration = {
  id: 46,
  name: '046_month_snapshots',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS month_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        wallets INTEGER NOT NULL,
        lent INTEGER NOT NULL,
        owed INTEGER NOT NULL,
        tontines INTEGER NOT NULL,
        net_worth INTEGER NOT NULL,
        income INTEGER NOT NULL,
        spending INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_month_snapshots_month ON month_snapshots(month, created_at)',
    );
    await addSyncColumns(db, 'month_snapshots');
  },
};
