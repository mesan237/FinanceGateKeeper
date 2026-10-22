import type { Migration } from '@/services/database';

import {
  addSyncColumns,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Events (VS-61): an occasion that causes spending — a wedding, a funeral, a
 * trip — so an expense can say *why* it happened, across categories.
 *
 * - `events`: a name and an optional date. Soft-deleted (`deleted_at`): the sync
 *   engine never sends deletions, so a hard delete would come back on restore.
 * - `expenses.event_id`: the one event an expense belongs to, or NULL.
 *
 * The expenses dirty-marking trigger is rebuilt with every column it already
 * watched (017's list plus `account_id`, `is_unplanned` and `refund_of`) and the
 * new one. SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 49,
  name: '049_events',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date TEXT,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
    );
    await addSyncColumns(db, 'events');

    await db.execute('ALTER TABLE expenses ADD COLUMN event_id INTEGER REFERENCES events(id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id)');
    await createUpdateTrigger(db, 'expenses', [
      ...DATA_COLUMNS.expenses,
      'account_id',
      'is_unplanned',
      'refund_of',
      'event_id',
    ]);
  },
};
