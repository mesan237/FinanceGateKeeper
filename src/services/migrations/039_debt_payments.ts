import type { Migration } from '@/services/database';

import {
  addSyncColumns,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Debts that move money (VS-44).
 *
 * 1. `debts.account_id`: the wallet the loan itself went through — lending
 *    from MoMo lowers MoMo, borrowing raises the wallet it lands in. Nullable:
 *    older debts, and loans already logged some other way, move nothing.
 * 2. `debts.deleted_at`: removal becomes a soft delete. A debt now moves money,
 *    and the sync engine never sends deletions, so a hard-deleted debt would
 *    come back on the next restore and move that money again.
 * 3. `debt_payments`: each repayment, with the wallet it went through. Partial
 *    repayments keep their history instead of overwriting the debt's amount.
 *    Kept out of income and spending entirely: only wallet balances read them.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 39,
  name: '039_debt_payments',
  async up(db) {
    await db.execute('ALTER TABLE debts ADD COLUMN account_id INTEGER REFERENCES accounts(id)');
    await db.execute('ALTER TABLE debts ADD COLUMN deleted_at TEXT');
    await createUpdateTrigger(db, 'debts', [...DATA_COLUMNS.debts, 'account_id', 'deleted_at']);

    await db.execute(
      `CREATE TABLE IF NOT EXISTS debt_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debt_id INTEGER NOT NULL REFERENCES debts(id),
        amount INTEGER NOT NULL CHECK(amount > 0),
        account_id INTEGER REFERENCES accounts(id),
        date TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id)');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_debt_payments_account ON debt_payments(account_id)',
    );
    await addSyncColumns(db, 'debt_payments');
  },
};
