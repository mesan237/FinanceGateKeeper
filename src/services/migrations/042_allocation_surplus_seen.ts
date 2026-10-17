import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Adds `allocations.surplus_seen` (VS-47): how much of the month's income
 * above its budget the user has already been asked about and chose to leave
 * unbudgeted.
 *
 * The month's budget no longer rises when income lands; income beyond it asks
 * to be given a job instead. Leaving it unassigned records the amount here, so
 * the prompt stays quiet until more income arrives. NULL means "never asked".
 *
 * The allocations dirty-marking trigger is rebuilt with every column it already
 * watched (017's list plus 028's `total_budget`) and the new one.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 42,
  name: '042_allocation_surplus_seen',
  async up(db) {
    await db.execute('ALTER TABLE allocations ADD COLUMN surplus_seen INTEGER');
    await createUpdateTrigger(db, 'allocations', [
      ...DATA_COLUMNS.allocations,
      'total_budget',
      'surplus_seen',
    ]);
  },
};
