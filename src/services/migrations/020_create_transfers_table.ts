import type { Migration } from '@/services/database';

/**
 * Creates the `transfers` table: one row per account-to-account move of money
 * (e.g. Cash → MTN MoMo). A transfer credits `to_account_id` and debits
 * `from_account_id` in the computed balance; it never touches income, expense,
 * or budget totals because no money enters or leaves the system. The two indexes
 * back the from/to legs of `getAccountBalance` and the per-account history.
 */
export const migration: Migration = {
  id: 20,
  name: '020_create_transfers_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_account_id INTEGER NOT NULL REFERENCES accounts(id),
        to_account_id INTEGER NOT NULL REFERENCES accounts(id),
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id)',
    );
    await db.execute('CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_account_id)');
  },
};
