import type { Migration } from '@/services/database';

import {
  createInsertTrigger,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/** Every column `goals` had after 043, copied across unchanged. */
const KEPT = [
  'id',
  ...DATA_COLUMNS.goals,
  'uuid',
  'updated_at',
  'sync_status',
].join(', ');

/**
 * Emergency reserves (VS-50): a third goal kind, `reserve`, sized in months of
 * essential spending, with the months in a new `target_months` column (1–12;
 * NULL for buffers and sinking funds). The app multiplies the months by the
 * observed (else estimated) essentials, so `target_amount` holds the last
 * figure computed and is refreshed on read.
 *
 * SQLite cannot change a CHECK constraint, so the table is rebuilt: create the
 * new shape, copy every row as it is — ids, cloud keys and sync state included,
 * so nothing re-uploads or duplicates — drop the old table and rename. The
 * indexes and the sync triggers are recreated on the new table. All in one
 * transaction: a failure leaves the old table untouched. Nothing references
 * `goals`, so no foreign key points at the table being dropped.
 */
export const migration: Migration = {
  id: 44,
  name: '044_goal_reserve',
  async up(db) {
    await db.execute('BEGIN TRANSACTION');
    try {
      await db.execute(
        `CREATE TABLE goals_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('buffer','sinking','reserve')),
          target_amount INTEGER NOT NULL CHECK(target_amount > 0),
          target_date TEXT,
          account_id INTEGER NOT NULL REFERENCES accounts(id),
          monthly_amount INTEGER NOT NULL DEFAULT 0 CHECK(monthly_amount >= 0),
          created_at TEXT NOT NULL,
          deleted_at TEXT,
          uuid TEXT,
          updated_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          target_months INTEGER CHECK(target_months IS NULL OR target_months BETWEEN 1 AND 12)
        )`,
      );
      await db.execute(`INSERT INTO goals_new (${KEPT}) SELECT ${KEPT} FROM goals`);
      await db.execute('DROP TABLE goals');
      await db.execute('ALTER TABLE goals_new RENAME TO goals');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_goals_account ON goals(account_id)');
      await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_uuid ON goals(uuid)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_goals_sync_status ON goals(sync_status)');
      await createInsertTrigger(db, 'goals');
      await createUpdateTrigger(db, 'goals', [...DATA_COLUMNS.goals, 'target_months']);
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  },
};
