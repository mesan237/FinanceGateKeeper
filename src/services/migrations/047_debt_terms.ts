import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Debt terms (VS-54): what a loan really costs and how it is paid back.
 *
 * 1. `debts.total_to_repay`: the total the borrower pays back, interest
 *    included — the user types it rather than a rate. NULL means "the amount",
 *    every debt before this. The cost is `total_to_repay − amount`.
 * 2. `debts.instalment_count`, `instalment_frequency` (`weekly` | `monthly`),
 *    `first_instalment_date`: an optional equal-instalment schedule. The dates
 *    are derived (`utils/cycleDate`), never stored.
 * 3. `debt_payments.instalment`: which instalment a repayment pays (NULL for a
 *    free repayment), so ticking one paid and undoing it are exact.
 *
 * Validation lives in the debt service. The dirty-marking triggers are rebuilt
 * with every column they already watched plus the new ones.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 47,
  name: '047_debt_terms',
  async up(db) {
    await db.execute('ALTER TABLE debts ADD COLUMN total_to_repay INTEGER');
    await db.execute('ALTER TABLE debts ADD COLUMN instalment_count INTEGER');
    await db.execute('ALTER TABLE debts ADD COLUMN instalment_frequency TEXT');
    await db.execute('ALTER TABLE debts ADD COLUMN first_instalment_date TEXT');
    await createUpdateTrigger(db, 'debts', [
      ...DATA_COLUMNS.debts,
      'account_id',
      'deleted_at',
      'total_to_repay',
      'instalment_count',
      'instalment_frequency',
      'first_instalment_date',
    ]);

    await db.execute('ALTER TABLE debt_payments ADD COLUMN instalment INTEGER');
    await createUpdateTrigger(db, 'debt_payments', [...DATA_COLUMNS.debt_payments, 'instalment']);
  },
};
