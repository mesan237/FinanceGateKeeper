import type { Migration } from '@/services/database';

import {
  addSyncColumns,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Wallet integrity (VS-42).
 *
 * 1. `quick_add_templates.account_id` and `recurring_expenses.account_id`: the
 *    wallet an auto-logged or one-tap expense is paid from. Before this, those
 *    expenses carried no wallet and never reduced any balance. Nullable: older
 *    templates stay unassigned until the user picks a wallet — nothing is
 *    guessed. Their update triggers are rebuilt with the column appended (the
 *    017 lists cannot name it: 017 runs before this column exists).
 *
 * 2. `balance_checks`: "my MoMo actually shows 43,500 today". A check pins a
 *    wallet's balance at a date; the balance afterwards is that figure plus what
 *    happened after it, so back-logging older transactions no longer shifts a
 *    balance the user has already confirmed. `difference` records how far off
 *    the app was when the check was made, for the account history only.
 *    `deleted_at` soft-deletes: the sync engine never sends deletions, so a hard
 *    delete would come back on the next restore.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 37,
  name: '037_wallet_integrity',
  async up(db) {
    for (const table of ['quick_add_templates', 'recurring_expenses'] as const) {
      await db.execute(
        `ALTER TABLE ${table} ADD COLUMN account_id INTEGER REFERENCES accounts(id)`,
      );
      await createUpdateTrigger(db, table, [...DATA_COLUMNS[table], 'account_id']);
    }

    await db.execute(
      `CREATE TABLE IF NOT EXISTS balance_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        balance INTEGER NOT NULL,
        difference INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_balance_checks_account ON balance_checks(account_id, date)',
    );
    await addSyncColumns(db, 'balance_checks');
  },
};
