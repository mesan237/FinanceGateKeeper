import type { Migration } from '@/services/database';

export const migration001: Migration = {
  id: 1,
  name: '001_create_migrations_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )`,
    );
  },
};
