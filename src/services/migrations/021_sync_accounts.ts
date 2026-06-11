import type { Migration } from '@/services/database';

import {
  addSyncColumns,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Brings the VS-18 schema into the cloud-sync layer. Migration 017 could not
 * provision `accounts` and `transfers` (they did not exist yet) nor add
 * `account_id` to the child triggers (the column lands in migration 019), so
 * this migration finishes the job once everything exists:
 *
 *  1. Adds `uuid`/`updated_at`/`sync_status` + dirty-marking triggers to
 *     `accounts` and `transfers` (and backfills the three seeded accounts).
 *  2. Recreates the `AFTER UPDATE OF` trigger on each table that gained an
 *     `account_id` column so re-attributing a row to a wallet marks it pending.
 */
const CHILD_TABLES = ['expenses', 'income', 'fund_transactions', 'project_transactions'] as const;

export const migration: Migration = {
  id: 21,
  name: '021_sync_accounts',
  async up(db) {
    await addSyncColumns(db, 'accounts');
    await addSyncColumns(db, 'transfers');

    for (const table of CHILD_TABLES) {
      await createUpdateTrigger(db, table, [...DATA_COLUMNS[table], 'account_id']);
    }
  },
};
