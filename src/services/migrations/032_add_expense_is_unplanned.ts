import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Adds `is_unplanned` to `expenses` — the user's "imprévu" mark for spending
 * that caught them off guard (VS-38). It is a flag beside the category, not a
 * category of its own, so an unexpected pharmacy bill still counts under Health.
 *
 * Defaults to 0: every existing expense reads as planned, with no backfill.
 *
 * The expenses dirty-marking trigger is rebuilt with the new column appended
 * (after `account_id`, which migration 021 added), so flagging or unflagging an
 * expense marks it pending and the change reaches the cloud.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 32,
  name: '032_add_expense_is_unplanned',
  async up(db) {
    await db.execute('ALTER TABLE expenses ADD COLUMN is_unplanned INTEGER NOT NULL DEFAULT 0');
    await createUpdateTrigger(db, 'expenses', [
      ...DATA_COLUMNS.expenses,
      'account_id',
      'is_unplanned',
    ]);
  },
};
