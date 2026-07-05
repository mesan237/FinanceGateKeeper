import type { Migration } from '@/services/database';

/**
 * Adds `onboarding_complete` to the single `users` row so the first-run
 * onboarding carousel (VS-23) shows exactly once. A brand-new install seeds its
 * `users` row *after* migrations run, so it picks up the column default (0 →
 * carousel shown); any row that already exists at upgrade time is backfilled to
 * 1 so a returning user never sees the intro. `users` is excluded from cloud
 * sync, so this stays device-local.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub (matches 024).
 */
export const migration: Migration = {
  id: 25,
  name: '025_add_onboarding_complete',
  async up(db) {
    await db.execute(`ALTER TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0`);
    await db.execute(`UPDATE users SET onboarding_complete = 1`);
  },
};
