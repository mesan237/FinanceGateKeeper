import type { Migration } from '@/services/database';

import {
  createInsertTrigger,
  createUpdateTrigger,
  DATA_COLUMNS,
} from '@/services/migrations/017_add_sync_metadata';

/** Every column `recurring_expenses` had after 037, copied across unchanged. */
const KEPT = [
  'id',
  ...DATA_COLUMNS.recurring_expenses,
  'uuid',
  'updated_at',
  'sync_status',
  'account_id',
].join(', ');

/**
 * Weekday recurring expenses (VS-60): a third frequency, `weekdays`, for spending
 * that happens Monday to Friday — the taxi to work — so the routine is logged as
 * fixed and stops reading as spending the user could cut.
 *
 * SQLite cannot change a CHECK constraint, so the table is rebuilt as in 044:
 * create the new shape, copy every row as it is — ids, cloud keys, wallet and
 * sync state included, so nothing re-uploads or duplicates — drop the old table
 * and rename. The index and the sync triggers are recreated on the new table.
 * All in one transaction. Nothing references `recurring_expenses`, so no foreign
 * key points at the table being dropped. Supabase stores `frequency` as plain
 * text, so the cloud needs no patch.
 */
export const migration: Migration = {
  id: 48,
  name: '048_recurring_weekdays',
  async up(db) {
    await db.execute('BEGIN TRANSACTION');
    try {
      await db.execute(
        `CREATE TABLE recurring_expenses_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          amount INTEGER NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          subcategory_id INTEGER REFERENCES categories(id),
          frequency TEXT NOT NULL CHECK(frequency IN ('monthly','weekly','weekdays')),
          next_due_date TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          uuid TEXT,
          updated_at TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          account_id INTEGER REFERENCES accounts(id)
        )`,
      );
      await db.execute(`INSERT INTO recurring_expenses_new (${KEPT}) SELECT ${KEPT} FROM recurring_expenses`);
      await db.execute('DROP TABLE recurring_expenses');
      await db.execute('ALTER TABLE recurring_expenses_new RENAME TO recurring_expenses');
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_recurring_active_due ON recurring_expenses(is_active, next_due_date)',
      );
      await db.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_recurring_expenses_uuid ON recurring_expenses(uuid)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_recurring_expenses_sync_status ON recurring_expenses(sync_status)',
      );
      await createInsertTrigger(db, 'recurring_expenses');
      await createUpdateTrigger(db, 'recurring_expenses', [...DATA_COLUMNS.recurring_expenses, 'account_id']);
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  },
};
