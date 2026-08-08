import type { Migration } from '@/services/database';

/**
 * Adds `total_budget` to `allocations` — the user's explicit spendable total for
 * the month (VS-33).
 *
 * The column is **nullable on purpose**, and NULL is the meaningful default:
 * it means "derive the total the way the app always has" — allocated income ×
 * `expenses_pct`. Every pre-existing month therefore keeps its current figure
 * with no backfill, and the income-allocation engine keeps driving funds,
 * projects, and redistribution untouched. Setting a value overrides the derived
 * figure for that month only; clearing it back to NULL returns to the split.
 *
 * The `allocations` dirty-marking trigger is rebuilt in migration 028 so that
 * editing the total also marks the row for cloud sync — this migration cannot
 * do it itself, since `addSyncColumns`/`createUpdateTrigger` need the column to
 * already exist (the same ordering constraint migration 021 solved for
 * `account_id`).
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 27,
  name: '027_add_allocation_total_budget',
  async up(db) {
    await db.execute('ALTER TABLE allocations ADD COLUMN total_budget INTEGER');
  },
};
