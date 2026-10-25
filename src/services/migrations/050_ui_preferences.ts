import type { Migration } from '@/services/database';

/**
 * UI preferences (UX-14): small choices about how screens look on this phone,
 * such as which Reports groups the user opened or closed. Key/value, local
 * only: not in `SYNCED_TABLES`, so it needs no sync columns, no trigger and no
 * Supabase patch, and a fresh install simply starts from the defaults.
 */
export const migration: Migration = {
  id: 50,
  name: '050_ui_preferences',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS ui_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      )`,
    );
  },
};
