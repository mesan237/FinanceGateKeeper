import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Adds `expenses.refund_of` (VS-45): a refund is an expense row with a negative
 * amount that points at the purchase it refunds. Stored this way, every total
 * that sums expenses — month spend, category envelopes, reports, averages,
 * wallet balances — nets the refund out in the month the money comes back,
 * without a second ledger to keep in step.
 *
 * The expenses dirty-marking trigger is rebuilt with every column it already
 * watched (017's list plus 021's `account_id` and 032's `is_unplanned`) and
 * the new one.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 40,
  name: '040_expense_refunds',
  async up(db) {
    await db.execute('ALTER TABLE expenses ADD COLUMN refund_of INTEGER REFERENCES expenses(id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_expenses_refund_of ON expenses(refund_of)');
    await createUpdateTrigger(db, 'expenses', [
      ...DATA_COLUMNS.expenses,
      'account_id',
      'is_unplanned',
      'refund_of',
    ]);
  },
};
