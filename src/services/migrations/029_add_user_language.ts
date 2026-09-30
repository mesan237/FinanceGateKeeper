import type { Migration } from '@/services/database';

/**
 * Adds `language` to the single `users` row: the Settings language override
 * (VS-35). NULL — the default for new and existing installs alike — means
 * "follow the device language". The CHECK mirrors `SUPPORTED_LANGUAGES` in
 * `i18n/resolveLanguage.ts`. `users` is excluded from cloud sync and export,
 * so the choice stays on this device.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub (matches 024/025).
 */
export const migration: Migration = {
  id: 29,
  name: '029_add_user_language',
  async up(db) {
    await db.execute(
      `ALTER TABLE users ADD COLUMN language TEXT CHECK (language IN ('en', 'fr'))`,
    );
  },
};
