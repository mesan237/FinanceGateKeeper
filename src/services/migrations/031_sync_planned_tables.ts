import type { Migration } from '@/services/database';

import { addSyncColumns } from '@/services/migrations/017_add_sync_metadata';

/**
 * Brings the VS-36 planned-purchases tables into the cloud-sync layer, finishing
 * what migration 030 could not do itself (the sync helpers need the tables to
 * exist — the ordering constraint migrations 021 and 028 solved before it).
 *
 * Adds `uuid`/`updated_at`/`sync_status` and the dirty-marking triggers to
 * `planned_lists` and `planned_items`. The triggers watch `expense_id`, so when
 * an expense is deleted and the FK action clears the link, the reopened item is
 * marked pending and the change reaches the other devices.
 */
export const migration: Migration = {
  id: 31,
  name: '031_sync_planned_tables',
  async up(db) {
    await addSyncColumns(db, 'planned_lists');
    await addSyncColumns(db, 'planned_items');
  },
};
