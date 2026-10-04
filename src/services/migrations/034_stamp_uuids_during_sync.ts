import type { Migration } from '@/services/database';

import {
  createInsertTrigger,
  SYNCED_TABLES,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * Fixes rows saved without a uuid, which the cloud rejects ("null value in
 * column uuid ... violates not-null constraint") and which then block every push.
 *
 * The insert triggers used to skip while `_sync_guard` was raised. A pull keeps
 * the guard up for its whole run, and background sync pulls each time the app
 * opens, so a list or expense saved in those seconds got no uuid. A pull killed
 * mid-way (app swiped away) also left the guard up for good.
 *
 * This rebuilds every insert trigger without the guard condition, stamps the
 * rows already missing a uuid (marked pending so they push), and lowers the
 * guard in case a killed sync left it raised.
 */
export const migration: Migration = {
  id: 34,
  name: '034_stamp_uuids_during_sync',
  async up(db) {
    await db.execute('UPDATE _sync_guard SET active = 0 WHERE id = 1');
    for (const table of SYNCED_TABLES) {
      await createInsertTrigger(db, table);
      await db.execute(
        `UPDATE ${table}
           SET uuid = lower(hex(randomblob(16))),
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
               sync_status = 'pending'
           WHERE uuid IS NULL`,
      );
    }
  },
};
