import type { Migration } from '@/services/database';

/**
 * Adds the `allocation_status` column to `income`. A row is either `allocated`
 * (counted in the month's expense budget; its fund/project portions deposited)
 * or `pending` (held in the unallocated pool until the user decides where it
 * goes). VS-19 changes the model so new income is created `pending` and only
 * becomes `allocated` on Confirm or a deliberate pool allocation.
 *
 * The column DEFAULT is `allocated` so every pre-existing row keeps its current
 * behaviour (legacy income already inflated the derived budget); the income
 * service overrides this to `pending` on each new insert.
 *
 * SQLite < 3.35 does not support DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 22,
  name: '022_add_income_allocation_status',
  async up(db) {
    await db.execute(
      `ALTER TABLE income ADD COLUMN allocation_status TEXT NOT NULL DEFAULT 'allocated'`,
    );
    await db.execute(
      `CREATE INDEX IF NOT EXISTS idx_income_allocation_status ON income(allocation_status)`,
    );
  },
};
