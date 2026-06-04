import type { Migration } from '@/services/database';
import { migration as createCategoriesTable } from '@/services/migrations/001_create_categories_table';
import { migration as createExpensesTable } from '@/services/migrations/002_create_expenses_table';

export const migrations: ReadonlyArray<Migration> = [
  createCategoriesTable,
  createExpensesTable,
];
