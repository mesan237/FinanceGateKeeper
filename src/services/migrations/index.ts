import type { Migration } from '@/services/database';
import { migration as createCategoriesTable } from '@/services/migrations/001_create_categories_table';
import { migration as createExpensesTable } from '@/services/migrations/002_create_expenses_table';
import { migration as addCategoryIsHidden } from '@/services/migrations/003_add_category_is_hidden';
import { migration as createIncomeTable } from '@/services/migrations/004_create_income_table';
import { migration as createAllocationsTable } from '@/services/migrations/005_create_allocations_table';
import { migration as createQuickAddTemplatesTable } from '@/services/migrations/006_create_quick_add_templates_table';
import { migration as createRecurringExpensesTable } from '@/services/migrations/007_create_recurring_expenses_table';
import { migration as createUsersTable } from '@/services/migrations/008_create_users_table';
import { migration as createZeroDaysTable } from '@/services/migrations/009_create_zero_days_table';
import { migration as createFundsTable } from '@/services/migrations/010_create_funds_table';
import { migration as createFundTransactionsTable } from '@/services/migrations/011_create_fund_transactions_table';
import { migration as createProjectsTable } from '@/services/migrations/012_create_projects_table';
import { migration as createProjectTransactionsTable } from '@/services/migrations/013_create_project_transactions_table';
import { migration as createDebtsTable } from '@/services/migrations/014_create_debts_table';
import { migration as dedupeCategories } from '@/services/migrations/015_dedupe_categories';

export const migrations: ReadonlyArray<Migration> = [
  createCategoriesTable,
  createExpensesTable,
  addCategoryIsHidden,
  createIncomeTable,
  createAllocationsTable,
  createQuickAddTemplatesTable,
  createRecurringExpensesTable,
  createUsersTable,
  createZeroDaysTable,
  createFundsTable,
  createFundTransactionsTable,
  createProjectsTable,
  createProjectTransactionsTable,
  createDebtsTable,
  dedupeCategories,
];
