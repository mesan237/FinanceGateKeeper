import type { Migration } from '@/services/database';

import {
  addSyncColumns,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Brings the VS-33 schema into the cloud-sync layer, finishing what migrations
 * 026 and 027 could not do themselves (the sync helpers need their columns to
 * already exist — the ordering constraint migration 021 solved for accounts):
 *
 *  1. Adds `uuid`/`updated_at`/`sync_status` + dirty-marking triggers to
 *     `category_budgets`.
 *  2. Recreates the `allocations` update trigger with `total_budget` appended,
 *     so changing a month's explicit total marks the row pending rather than
 *     silently staying behind on other devices.
 */
export const migration: Migration = {
  id: 28,
  name: '028_sync_category_budgets',
  async up(db) {
    await addSyncColumns(db, 'category_budgets');
    await createUpdateTrigger(db, 'allocations', [
      ...DATA_COLUMNS.allocations,
      'total_budget',
    ]);
  },
};
