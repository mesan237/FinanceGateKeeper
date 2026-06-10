import type { Migration } from '@/services/database';

/**
 * Creates the `project_transactions` table: one row per contribution to a
 * project, forming the audit trail behind each project's `funded_amount`.
 * `source` is a closed enum guarded by a CHECK constraint — `allocation` for
 * automatic cascade funding on income confirm, `manual` for a user top-up. The
 * index backs `getProjectTransactions` (`WHERE project_id = ?`).
 */
export const migration: Migration = {
  id: 13,
  name: '013_create_project_transactions_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS project_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        amount INTEGER NOT NULL,
        date TEXT NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('allocation','manual')),
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id
        ON project_transactions(project_id)`,
    );
  },
};
