import type { Migration } from '@/services/database';

/**
 * Adds an `is_hidden` flag to `categories`. Default categories cannot be
 * deleted (only hidden), and custom ones may be hidden too; hidden categories
 * drop out of the picker while their historical expenses keep resolving their
 * label. Additive column — existing rows default to visible.
 */
export const migration: Migration = {
  id: 3,
  name: '003_add_category_is_hidden',
  async up(db) {
    await db.execute(
      'ALTER TABLE categories ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0',
    );
  },
};
