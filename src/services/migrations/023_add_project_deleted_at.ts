import type { Migration } from '@/services/database';

/**
 * Adds the nullable `deleted_at` column to `projects` for soft deletion. A
 * project with `deleted_at IS NULL` is active; a non-null timestamp moves it to
 * the "Recently deleted" recovery list. The projects service excludes deleted
 * rows from every active read, restores by clearing the column, and a purge job
 * hard-deletes rows whose `deleted_at` is older than the recovery window.
 *
 * SQLite < 3.35 does not support DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 23,
  name: '023_add_project_deleted_at',
  async up(db) {
    await db.execute(`ALTER TABLE projects ADD COLUMN deleted_at TEXT`);
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at)`,
    );
  },
};
