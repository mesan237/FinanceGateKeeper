import type { Migration } from '@/services/database';

/**
 * Creates the single-row `users` table that holds the app/user record. VS-08
 * uses only the app-settings columns (`app_mode`, `reminder_time`,
 * `notifications_enabled`); `pin_hash` is created nullable and stays unused
 * until VS-02 (PIN Auth) populates it. `app_mode` is a closed enum guarded by a
 * CHECK constraint and defaults to `learning` so a fresh install starts in the
 * onboarding mode.
 */
export const migration: Migration = {
  id: 8,
  name: '008_create_users_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pin_hash TEXT,
        app_mode TEXT NOT NULL DEFAULT 'learning' CHECK(app_mode IN ('learning','control')),
        reminder_time TEXT NOT NULL DEFAULT '21:00',
        notifications_enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
    );
  },
};
