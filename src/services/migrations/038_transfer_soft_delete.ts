import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Adds `deleted_at` to `transfers` so a transfer can be removed (VS-43).
 *
 * A soft delete, not a DELETE: the sync engine never sends deletions, so a
 * hard-deleted transfer would come back from the cloud on the next restore and
 * silently move money between wallets again. Every read filters
 * `deleted_at IS NULL`. The dirty-marking trigger is rebuilt with the column so
 * the removal itself syncs.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 38,
  name: '038_transfer_soft_delete',
  async up(db) {
    await db.execute('ALTER TABLE transfers ADD COLUMN deleted_at TEXT');
    await createUpdateTrigger(db, 'transfers', [...DATA_COLUMNS.transfers, 'deleted_at']);
  },
};
