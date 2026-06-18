import type { Migration } from '@/services/database';

/**
 * Adds a nullable `account_id` foreign key to every table that records a real
 * money movement: `expenses`, `income`, `fund_transactions`,
 * `project_transactions`. The column is purely additive — every pre-existing row
 * (and every automated allocation deposit, which carries no wallet) keeps
 * `account_id = NULL` and therefore contributes to no account balance. Indexes
 * back the per-account balance sums in `getAccountBalance`.
 */
export const migration: Migration = {
  id: 19,
  name: '019_add_account_id_columns',
  async up(db) {
    const tables = ['expenses', 'income', 'fund_transactions', 'project_transactions'] as const;
    const indexNames: Record<(typeof tables)[number], string> = {
      expenses: 'idx_expenses_account_id',
      income: 'idx_income_account_id',
      fund_transactions: 'idx_fund_tx_account_id',
      project_transactions: 'idx_project_tx_account_id',
    };
    for (const table of tables) {
      await db.execute(
        `ALTER TABLE ${table} ADD COLUMN account_id INTEGER REFERENCES accounts(id)`,
      );
      await db.execute(
        `CREATE INDEX IF NOT EXISTS ${indexNames[table]} ON ${table}(account_id)`,
      );
    }
  },
};
