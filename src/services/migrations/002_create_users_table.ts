import type { Migration } from '@/services/database';

export const migration: Migration = {
  id: 2,
  name: '002_create_users_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        pin_hash TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        app_mode TEXT NOT NULL DEFAULT 'learning',
        created_at TEXT NOT NULL
      )`,
    );
  },
};
