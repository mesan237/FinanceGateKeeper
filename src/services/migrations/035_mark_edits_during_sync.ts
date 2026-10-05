import type { Migration } from '@/services/database';

import {
  createUpdateTrigger,
  DATA_COLUMNS,
  SYNCED_TABLES,
  type SyncedTable,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Columns later migrations appended to a table's dirty-marking trigger: 021
 * (`account_id` on the child tables), 028 (`allocations.total_budget`), 032
 * (`expenses.is_unplanned`) and 033 (`planned_lists.due_date`).
 */
const APPENDED_COLUMNS: Partial<Record<SyncedTable, string[]>> = {
  expenses: ['account_id', 'is_unplanned'],
  income: ['account_id'],
  fund_transactions: ['account_id'],
  project_transactions: ['account_id'],
  allocations: ['total_budget'],
  planned_lists: ['due_date'],
};

/**
 * Stops edits made during a sync from being lost.
 *
 * The update triggers used to skip while `_sync_guard` was raised, i.e. for a
 * whole pull. An edit the user saved in that window was never marked pending,
 * so it stayed on the phone until the row was edited again. The triggers now
 * skip only statements that set `updated_at` themselves, which only the sync
 * engine does (see `createUpdateTrigger`). This rebuilds every update trigger
 * over the same columns it watched before, with that condition.
 */
export const migration: Migration = {
  id: 35,
  name: '035_mark_edits_during_sync',
  async up(db) {
    for (const table of SYNCED_TABLES) {
      await createUpdateTrigger(db, table, [
        ...DATA_COLUMNS[table],
        ...(APPENDED_COLUMNS[table] ?? []),
      ]);
    }
  },
};
