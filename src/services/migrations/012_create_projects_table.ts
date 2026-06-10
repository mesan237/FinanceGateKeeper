import type { Migration } from '@/services/database';

/**
 * Creates the `projects` table: one row per funding goal (investment, launch,
 * purchase). `priority_rank` (1 = highest) drives the funding cascade — rank 1
 * is filled to target before rank 2 receives anything. `status` is a closed
 * enum guarded by a CHECK constraint; `deadline` is nullable. Amounts are
 * integers (FCFA, no decimals). The index backs priority-ordered reads and the
 * cascade query.
 */
export const migration: Migration = {
  id: 12,
  name: '012_create_projects_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount INTEGER NOT NULL,
        funded_amount INTEGER NOT NULL DEFAULT 0,
        priority_rank INTEGER NOT NULL,
        deadline TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused')),
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority_rank)',
    );
  },
};
