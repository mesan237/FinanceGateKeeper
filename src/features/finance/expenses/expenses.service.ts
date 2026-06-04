import { execute, query } from '@/services/database';

import type { Category, Expense, NewCategory, NewExpense } from './expenses.types';

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
  is_hidden: number;
}

const EXPENSE_COLUMNS =
  'id, amount, category_id, subcategory_id, note, date, is_recurring, created_at';
const CATEGORY_COLUMNS = 'id, name, parent_id, is_default, is_hidden';
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
    isHidden: row.is_hidden === 1,
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

/** Returns the visible (non-hidden) top-level parent categories, in seed order. */
export async function getCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories
     WHERE parent_id IS NULL AND is_hidden = 0 ORDER BY sort_order, id`,
  );
  return rows.map(mapCategory);
}

/** Returns the visible subcategories of a given parent category, in seed order. */
export async function getSubcategories(parentId: number): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories
     WHERE parent_id = ? AND is_hidden = 0 ORDER BY sort_order, id`,
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

/**
 * Creates a custom parent category (`parentId: null`) or subcategory, appended
 * after its existing siblings. Always non-default and visible.
 *
 * @throws if the trimmed name is empty.
 */
export async function createCategory(input: NewCategory): Promise<number> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Category name cannot be empty.');
  }
  const parentId = input.parentId ?? null;
  const [{ next }] =
    parentId === null
      ? await query<{ next: number }>(
          'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM categories WHERE parent_id IS NULL',
        )
      : await query<{ next: number }>(
          'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM categories WHERE parent_id = ?',
          [parentId],
        );

  await execute(
    'INSERT INTO categories (name, parent_id, is_default, is_hidden, sort_order) VALUES (?, ?, 0, 0, ?)',
    [name, parentId, next],
  );
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/**
 * Renames a category (or subcategory).
 *
 * @throws if the trimmed name is empty.
 */
export async function renameCategory(id: number, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Category name cannot be empty.');
  }
  await execute('UPDATE categories SET name = ? WHERE id = ?', [trimmed, id]);
}

/** Hides or unhides a category. Hidden categories drop out of the picker. */
export async function setCategoryHidden(id: number, hidden: boolean): Promise<void> {
  await execute('UPDATE categories SET is_hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
}

/**
 * Deletes a custom category, first reassigning every expense filed under it (or
 * any of its subcategories) to `reassignToId` and clearing their now-stale
 * subcategory. The category's subcategories are removed too. Default categories
 * cannot be deleted — hide them instead.
 *
 * @throws if the category is default, is missing, or the reassignment target is
 *   missing / the category itself / one of its subcategories.
 */
export async function deleteCategory(id: number, reassignToId: number): Promise<void> {
  if (reassignToId === id) {
    throw new Error('Cannot reassign a category to itself.');
  }
  const [category] = await query<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE id = ?`,
    [id],
  );
  if (!category) {
    throw new Error('Category not found.');
  }
  if (category.is_default === 1) {
    throw new Error('Default categories cannot be deleted — hide them instead.');
  }
  const [target] = await query<{ id: number }>('SELECT id FROM categories WHERE id = ?', [
    reassignToId,
  ]);
  if (!target) {
    throw new Error('Reassignment target category does not exist.');
  }

  const subs = await query<{ id: number }>('SELECT id FROM categories WHERE parent_id = ?', [id]);
  const affected = [id, ...subs.map((s) => s.id)];
  if (affected.includes(reassignToId)) {
    throw new Error('Cannot reassign expenses to a category being deleted.');
  }
  const placeholders = affected.map(() => '?').join(', ');
  // Reassign-then-delete must be atomic: a crash between them would leave
  // expenses repointed but the category rows still present.
  await execute('BEGIN TRANSACTION');
  try {
    await execute(
      `UPDATE expenses SET category_id = ?, subcategory_id = NULL
       WHERE category_id IN (${placeholders}) OR subcategory_id IN (${placeholders})`,
      [reassignToId, ...affected, ...affected],
    );
    await execute('DELETE FROM categories WHERE parent_id = ?', [id]);
    await execute('DELETE FROM categories WHERE id = ?', [id]);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
}

/**
 * Persists a new ordering for a set of sibling categories by writing each id's
 * position in `orderedIds` to its `sort_order`.
 */
export async function reorderCategories(orderedIds: number[]): Promise<void> {
  for (let position = 0; position < orderedIds.length; position += 1) {
    await execute('UPDATE categories SET sort_order = ? WHERE id = ?', [
      position,
      orderedIds[position],
    ]);
  }
}
