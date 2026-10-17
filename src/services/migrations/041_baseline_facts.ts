import type { Migration } from '@/services/database';

import { addSyncColumns } from '@/services/migrations/017_add_sync_metadata';

/**
 * Creates `baseline_facts` (VS-46): what the user tells the app about their
 * money before it has seen enough months to know — typical income, whether it
 * is regular, pay day, monthly essentials — plus a few checklist answers ("I
 * have no debts").
 *
 * Append-only: a new answer is a new row and the latest row per `kind` wins.
 * That keeps every earlier estimate (so an estimate never silently turns into
 * a fact) and is safe for sync, where two devices writing the same kind simply
 * leave two rows. `source` says whether the user typed the value or accepted
 * one the app observed. Kinds are validated in the service, not by a CHECK, so
 * new kinds need no migration.
 */
export const migration: Migration = {
  id: 41,
  name: '041_baseline_facts',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS baseline_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL,
        value INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL
      )`,
    );
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_baseline_facts_kind ON baseline_facts(kind, created_at)',
    );
    await addSyncColumns(db, 'baseline_facts');
  },
};
