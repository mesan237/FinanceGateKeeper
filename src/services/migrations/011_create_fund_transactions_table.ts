import type { Migration } from '@/services/database';

/**
 * Creates the `fund_transactions` table: one row per deposit or withdrawal
 * against a fund, forming the audit trail behind each fund's `current_amount`.
 * `direction` is a closed enum guarded by a CHECK constraint; `reason` is
 * free-text (e.g. "Allocation 2026-06" for auto-deposits, a user note for
 * manual withdrawals). The index backs `getFundTransactions` (`WHERE fund_id = ?`).
 */
export const migration: Migration = {
  id: 11,
  name: '011_create_fund_transactions_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS fund_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_id INTEGER NOT NULL REFERENCES funds(id),
        amount INTEGER NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('deposit','withdrawal')),
        reason TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_fund_transactions_fund_id
        ON fund_transactions(fund_id)`,
    );
  },
};
