import type { Migration } from '@/services/database';

import { createUpdateTrigger, DATA_COLUMNS } from '@/services/migrations/017_add_sync_metadata';

/**
 * Adds `cost_type` to `categories` — whether spending in the category is a
 * fixed commitment (rent, school fees) or variable day-to-day spending (food,
 * taxi) (VS-41). The "typical month" profile splits spending on it, so the user
 * can see which part of the month they can actually change.
 *
 * Nullable on purpose: NULL on a parent reads as variable, NULL on a
 * subcategory inherits its parent. That keeps older export files and cloud rows
 * (which carry no such column) valid without a backfill.
 *
 * The default Bills category starts as fixed. The dirty-marking trigger is
 * rebuilt first, so that seed change syncs like any user edit.
 *
 * SQLite < 3.35 has no DROP COLUMN, so there is no down stub.
 */
export const migration: Migration = {
  id: 36,
  name: '036_add_category_cost_type',
  async up(db) {
    await db.execute(
      `ALTER TABLE categories ADD COLUMN cost_type TEXT CHECK(cost_type IN ('fixed','variable'))`,
    );
    await createUpdateTrigger(db, 'categories', [...DATA_COLUMNS.categories, 'cost_type']);
    await db.execute(
      `UPDATE categories SET cost_type = 'fixed'
         WHERE is_default = 1 AND parent_id IS NULL AND name = 'Bills'`,
    );
  },
};
