import { DEFAULT_CATEGORIES } from '@/constants/categories';
import type { Migration } from '@/services/database';

export const migration: Migration = {
  id: 5,
  name: '005_seed_default_categories',
  async up(db) {
    const existing = await db.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM categories WHERE is_default = 1',
    );
    if ((existing[0]?.count ?? 0) > 0) return;

    for (const seed of DEFAULT_CATEGORIES) {
      await db.execute(
        'INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES (?, NULL, 1, ?)',
        [seed.name, seed.sort_order],
      );
      const parentRows = await db.query<{ id: number }>(
        'SELECT id FROM categories WHERE name = ? AND parent_id IS NULL',
        [seed.name],
      );
      const parentId = parentRows[0].id;

      for (let i = 0; i < seed.children.length; i += 1) {
        await db.execute(
          'INSERT INTO categories (name, parent_id, is_default, sort_order) VALUES (?, ?, 1, ?)',
          [seed.children[i], parentId, i + 1],
        );
      }
    }
  },
};
