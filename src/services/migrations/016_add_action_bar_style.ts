import type { Migration } from '@/services/database';

/**
 * Adds the `action_bar_style` column to `users`. Controls whether the
 * Transactions tab shows two explicit buttons (Quick Add + Log Expense) or a
 * single speed-dial FAB that expands to the same two actions.
 *
 * SQLite < 3.35 does not support DROP COLUMN, so the down stub is a no-op.
 * Rolling back requires dropping and recreating the table manually.
 */
export const migration: Migration = {
  id: 16,
  name: '016_add_action_bar_style',
  async up(db) {
    await db.execute(
      `ALTER TABLE users ADD COLUMN action_bar_style TEXT NOT NULL DEFAULT 'explicit'`,
    );
  },
};
