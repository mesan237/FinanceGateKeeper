import type { Migration, SqliteDriver } from '@/services/database';

import {
  addSyncColumns,
  createInsertTrigger,
  createUpdateTrigger,
} from '@/services/migrations/017_add_sync_metadata';

/**
 * The built-in income sources, in id order. Parents come before their
 * subsources so the ids are the same on every install: 1 salary, 2 freelance,
 * 3 business, 4 gift, 5 other, 6 e-commerce (under business). The uuids are
 * fixed too (`seed-income-source-<key>`), like the default categories, so two
 * phones never duplicate them when they sync. `name` is only a readable
 * fallback: a built-in is shown by its `key` in the active language.
 */
export const SEED_INCOME_SOURCES = [
  { id: 1, key: 'salary', name: 'Salary', parentId: null, sortOrder: 0 },
  { id: 2, key: 'freelance', name: 'Freelance', parentId: null, sortOrder: 1 },
  { id: 3, key: 'business', name: 'Business', parentId: null, sortOrder: 2 },
  { id: 4, key: 'gift', name: 'Gift & family support', parentId: null, sortOrder: 3 },
  { id: 5, key: 'other', name: 'Other', parentId: null, sortOrder: 4 },
  { id: 6, key: 'ecommerce', name: 'E-commerce', parentId: 3, sortOrder: 0 },
] as const;

/**
 * Inserts any built-in income source that is missing, keeping a row already
 * there. A seed starts synced with an empty `updated_at`: nothing is pushed
 * until the user changes it, and a cloud copy of it always wins a pull. Used by
 * this migration and after a restore or a backup import clears the table.
 */
export async function seedIncomeSources(execute: SqliteDriver['execute']): Promise<void> {
  for (const s of SEED_INCOME_SOURCES) {
    await execute(
      `INSERT OR IGNORE INTO income_sources
         (id, key, name, parent_id, is_hidden, sort_order, created_at, uuid, updated_at, sync_status)
       VALUES (?, ?, ?, ?, 0, ?, '2026-10-31T00:00:00.000Z', ?, '', 'synced')`,
      [s.id, s.key, s.name, s.parentId, s.sortOrder, `seed-income-source-${s.key}`],
    );
  }
}

/** The columns the `income` dirty-marking trigger watches after this migration. */
export const INCOME_DATA_COLUMNS = ['amount', 'source_id', 'note', 'date', 'created_at', 'account_id'];

/** The `income` columns copied across unchanged (everything but `source`). */
const KEPT = [
  'id',
  'amount',
  'note',
  'date',
  'created_at',
  'uuid',
  'updated_at',
  'sync_status',
  'account_id',
  'allocation_status',
].join(', ');

/**
 * Income sources the user can extend (VS-91): the three fixed tags (salary,
 * freelance, e-commerce) become rows in `income_sources`, one level deep, so a
 * user can add "Gift from my brother" or a subsource under Business.
 *
 * - `income_sources`: `key` names a built-in (NULL for the user's own),
 *   `parent_id` its parent (one level only), `is_hidden` takes it off the
 *   picker without touching past income. Synced; seeded with fixed ids/uuids.
 * - `income.source` (TEXT, CHECK to the three tags) becomes `source_id`, so
 *   the table is rebuilt as in 048: create the new shape, copy every row with
 *   its ids, cloud key and sync state (nothing re-uploads), drop, rename,
 *   recreate indexes and triggers, all in one transaction. E-commerce income
 *   lands on the e-commerce subsource under Business. Nothing references
 *   `income`, so no foreign key points at the table being dropped.
 */
export const migration: Migration = {
  id: 51,
  name: '051_income_sources',
  async up(db) {
    await db.execute('BEGIN TRANSACTION');
    try {
      await db.execute(
        `CREATE TABLE income_sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE,
          name TEXT NOT NULL,
          parent_id INTEGER REFERENCES income_sources(id),
          is_hidden INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        )`,
      );
      await addSyncColumns(db, 'income_sources');
      await seedIncomeSources((sql, params) => db.execute(sql, params));

      await db.execute(
        `CREATE TABLE income_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount INTEGER NOT NULL,
          source_id INTEGER NOT NULL REFERENCES income_sources(id),
          note TEXT,
          date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          uuid TEXT,
          updated_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          account_id INTEGER REFERENCES accounts(id),
          allocation_status TEXT NOT NULL DEFAULT 'allocated'
        )`,
      );
      await db.execute(
        `INSERT INTO income_new (${KEPT}, source_id)
         SELECT ${KEPT}, (SELECT s.id FROM income_sources s WHERE s.key = income.source) FROM income`,
      );
      await db.execute('DROP TABLE income');
      await db.execute('ALTER TABLE income_new RENAME TO income');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_income_date ON income(date)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_income_account_id ON income(account_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_income_allocation_status ON income(allocation_status)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_income_source ON income(source_id)');
      await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_income_uuid ON income(uuid)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_income_sync_status ON income(sync_status)');
      await createInsertTrigger(db, 'income');
      await createUpdateTrigger(db, 'income', INCOME_DATA_COLUMNS);
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  },
};

