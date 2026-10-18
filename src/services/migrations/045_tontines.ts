import type { Migration } from '@/services/database';

import { addSyncColumns } from '@/services/migrations/017_add_sync_metadata';

/**
 * Creates the tontine tables (VS-51): a rotating savings group and the money
 * the user moves through it.
 *
 * - `tontines`: the contribution, the cycle (`weekly` | `monthly`) from
 *   `start_date`, the number of members — which is also the number of cycles —
 *   and the user's payout turn, NULL until a draw settles it. `account_id` is
 *   the wallet the user usually pays from and receives into.
 * - `tontine_payments`: each contribution the user paid (one per cycle) and the
 *   payout they received, with the wallet it went through.
 *
 * Tontine money is neither spending nor income: only wallet balances read the
 * payments, as they do transfers and debt repayments. The schedule is never
 * stored — it is derived from the start date and the cycle, so editing the
 * tontine re-plans it. Both tables soft-delete (`deleted_at`): the sync engine
 * never sends deletions, so a hard delete would come back on restore.
 */
export const migration: Migration = {
  id: 45,
  name: '045_tontines',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS tontines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contribution_amount INTEGER NOT NULL CHECK(contribution_amount > 0),
        frequency TEXT NOT NULL CHECK(frequency IN ('weekly','monthly')),
        start_date TEXT NOT NULL,
        members INTEGER NOT NULL CHECK(members BETWEEN 2 AND 60),
        payout_turn INTEGER CHECK(payout_turn IS NULL OR (payout_turn >= 1 AND payout_turn <= members)),
        account_id INTEGER REFERENCES accounts(id),
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
    );
    await addSyncColumns(db, 'tontines');

    await db.execute(
      `CREATE TABLE IF NOT EXISTS tontine_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tontine_id INTEGER NOT NULL REFERENCES tontines(id),
        kind TEXT NOT NULL CHECK(kind IN ('contribution','payout')),
        cycle INTEGER NOT NULL CHECK(cycle >= 1),
        amount INTEGER NOT NULL CHECK(amount > 0),
        account_id INTEGER REFERENCES accounts(id),
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_tontine_payments_tontine ON tontine_payments(tontine_id)',
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_tontine_payments_account ON tontine_payments(account_id)',
    );
    await addSyncColumns(db, 'tontine_payments');
  },
};
