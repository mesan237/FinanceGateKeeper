import type { Migration } from '@/services/database';

/**
 * Adds the columns the auth slice needs to own a local PIN lock (VS-02) and a
 * user profile. `pin_hash` already exists (created nullable in migration 008);
 * `pin_salt` stores the per-install salt that `utils/pinHash` mixes in.
 * `display_name`, `avatar_color`, and `avatar_emoji` back the profile screen —
 * the avatar is rendered locally (initials/emoji on a color), never an uploaded
 * image. All columns are nullable so the existing single-row user upgrades
 * cleanly. `users` is excluded from cloud sync, so none of this is synced.
 *
 * SQLite < 3.35 does not support DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 24,
  name: '024_add_pin_and_profile_columns',
  async up(db) {
    await db.execute(`ALTER TABLE users ADD COLUMN pin_salt TEXT`);
    await db.execute(`ALTER TABLE users ADD COLUMN display_name TEXT`);
    await db.execute(`ALTER TABLE users ADD COLUMN avatar_color TEXT`);
    await db.execute(`ALTER TABLE users ADD COLUMN avatar_emoji TEXT`);
  },
};
