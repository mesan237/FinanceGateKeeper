import type { Migration } from '@/services/database';

import { migration as createUsersTable } from '@/services/migrations/002_create_users_table';
import { migration as createCategoriesTable } from '@/services/migrations/003_create_categories_table';
import { migration as createExpensesTable } from '@/services/migrations/004_create_expenses_table';
import { migration as seedDefaultCategories } from '@/services/migrations/005_seed_default_categories';

export const migrations: ReadonlyArray<Migration> = [
  createUsersTable,
  createCategoriesTable,
  createExpensesTable,
  seedDefaultCategories,
];
