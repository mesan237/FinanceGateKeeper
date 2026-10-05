import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Adds `due_date` to `planned_lists` — the day the user means to do the
 * shopping (VS-39). Items without their own `planned_date` fall due with it,
 * which drives the due-soon reminders, the drawer dot and the dashboard line.
 *
 * Nullable on purpose: lists made before this migration have no date and the
 * app asks for one when they are opened. New and edited lists must carry one;
 * the service enforces that, not the schema, so old rows stay valid.
 *
 * The `planned_lists` dirty-marking trigger is rebuilt with the new column so a
 * changed due date reaches the cloud.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 33,
  name: '033_add_planned_list_due_date',
  async up(db) {
    await db.execute('ALTER TABLE planned_lists ADD COLUMN due_date TEXT');
    await createUpdateTrigger(db, 'planned_lists', [...DATA_COLUMNS.planned_lists, 'due_date']);
  },
};
