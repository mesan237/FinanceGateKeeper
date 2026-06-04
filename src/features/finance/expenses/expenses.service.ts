import { execute, query } from '@/services/database';

import type { Category, Expense, NewExpense } from './expenses.types';

interface ExpenseRow {
  id: number;
  amount: number;
  category_id: number;
  subcategory_id: number | null;
  note: string | null;
  date: string;
  is_recurring: number;
  created_at: string;
}

interface CategoryRow {
  id: number;
  name: string;
  parent_id: number | null;
  is_default: number;
}

const EXPENSE_COLUMNS =
  'id, amount, category_id, subcategory_id, note, date, is_recurring, created_at';
const CATEGORY_COLUMNS = 'id, name, parent_id, is_default';
const ORDER_BY_NEWEST = 'ORDER BY date DESC, created_at DESC';

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    note: row.note,
    date: row.date,
    isRecurring: row.is_recurring === 1,
    createdAt: row.created_at,
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    isDefault: row.is_default === 1,
  };
}

/**
 * Validates and inserts a new expense, returning the new row id. Validation
 * lives here (not only in the form hook) so callers that bypass `useExpenseLog`
 * — e.g. VS-07 quick-add / recurring auto-log — cannot write invalid rows.
 *
 * @throws if `amount` is not a positive integer, or `categoryId` is missing.
 */
export async function createExpense(input: NewExpense): Promise<number> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Expense amount must be a positive integer (FCFA).');
  }
  if (input.categoryId == null) {
    throw new Error('Expense must have a category.');
  }

  await execute(
    `INSERT INTO expenses
       (amount, category_id, subcategory_id, note, date, is_recurring, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.amount,
      input.categoryId,
      input.subcategoryId ?? null,
      input.note ?? null,
      input.date,
      input.isRecurring ? 1 : 0,
      new Date().toISOString(),
    ],
  );

  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/** Returns every expense, newest first (by date, then insertion time). */
export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await query<ExpenseRow>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses ${ORDER_BY_NEWEST}`,
  );
  return rows.map(mapExpense);
}

/**
 * Returns expenses whose `date` falls within `[from, to]` inclusive. Dates are
 * compared as ISO strings, which sort chronologically.
 */
export async function getExpensesByDateRange(from: string, to: string): Promise<Expense[]> {
  const rows = await query<ExpenseRow>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE date >= ? AND date <= ? ${ORDER_BY_NEWEST}`,
    [from, to],
  );
  return rows.map(mapExpense);
}

/** Returns expenses logged under the given parent category, newest first. */
export async function getExpensesByCategory(categoryId: number): Promise<Expense[]> {
  const rows = await query<ExpenseRow>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE category_id = ? ${ORDER_BY_NEWEST}`,
    [categoryId],
  );
  return rows.map(mapExpense);
}

/** Returns the top-level (parent) categories, in seed order. */
export async function getCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE parent_id IS NULL ORDER BY sort_order, id`,
  );
  return rows.map(mapCategory);
}

/** Returns the subcategories of a given parent category, in seed order. */
export async function getSubcategories(parentId: number): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE parent_id = ? ORDER BY sort_order, id`,
    [parentId],
  );
  return rows.map(mapCategory);
}

/**
 * Returns every category row (parents and subcategories). Used by the UI to
 * resolve an expense's category/subcategory id to a display label without an
 * extra round-trip per row.
 */
export async function getAllCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY sort_order, id`,
  );
  return rows.map(mapCategory);
}
