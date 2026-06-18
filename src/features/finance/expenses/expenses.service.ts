import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import type {
  Category,
  DayActivityStatus,
  Expense,
  Frequency,
  NewCategory,
  NewExpense,
  NewQuickAddTemplate,
  NewRecurringExpense,
  QuickAddTemplate,
  RecurringExpense,
} from './expenses.types';

interface ExpenseRow {
  id: number;
  amount: number;
  category_id: number;
  subcategory_id: number | null;
  note: string | null;
  date: string;
  is_recurring: number;
  account_id: number | null;
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
  'id, amount, category_id, subcategory_id, note, date, is_recurring, account_id, created_at';
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
    accountId: row.account_id,
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
       (amount, category_id, subcategory_id, note, date, is_recurring, account_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.amount,
      input.categoryId,
      input.subcategoryId ?? null,
      input.note ?? null,
      input.date,
      input.isRecurring ? 1 : 0,
      input.accountId ?? null,
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

// ---- VS-07: quick-add templates & recurring expenses -----------------------

interface QuickAddTemplateRow {
  id: number;
  label: string;
  amount: number;
  category_id: number;
  subcategory_id: number | null;
  sort_order: number;
  created_at: string;
}

interface RecurringExpenseRow {
  id: number;
  label: string;
  amount: number;
  category_id: number;
  subcategory_id: number | null;
  frequency: Frequency;
  next_due_date: string;
  is_active: number;
  created_at: string;
}

const QUICK_ADD_COLUMNS =
  'id, label, amount, category_id, subcategory_id, sort_order, created_at';
const RECURRING_COLUMNS =
  'id, label, amount, category_id, subcategory_id, frequency, next_due_date, is_active, created_at';

const FREQUENCY_SET: ReadonlySet<string> = new Set<Frequency>(['monthly', 'weekly']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function mapQuickAddTemplate(row: QuickAddTemplateRow): QuickAddTemplate {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapRecurringExpense(row: RecurringExpenseRow): RecurringExpense {
  return {
    id: row.id,
    label: row.label,
    amount: row.amount,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    frequency: row.frequency,
    nextDueDate: row.next_due_date,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

/** Throws unless `amount` is a positive integer (FCFA has no decimals). */
function assertAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Amount must be a positive integer (FCFA).');
  }
}

/** Throws unless the trimmed label is non-empty. Returns the trimmed value. */
function assertLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Label cannot be empty.');
  }
  return trimmed;
}

/** Throws unless `categoryId` references an existing category row. */
async function assertCategoryExists(categoryId: number): Promise<void> {
  const [row] = await query<{ id: number }>('SELECT id FROM categories WHERE id = ?', [
    categoryId,
  ]);
  if (!row) {
    throw new Error('Category does not exist.');
  }
}

/** Throws unless `value` matches `YYYY-MM-DD`. */
function assertISODate(value: string): void {
  if (!ISO_DATE.test(value)) {
    throw new Error('Date must be in YYYY-MM-DD format.');
  }
}

/** Throws unless `value` is a supported `Frequency`. */
function assertFrequency(value: string): void {
  if (!FREQUENCY_SET.has(value)) {
    throw new Error(`Unsupported frequency: ${value}.`);
  }
}

/**
 * Advances an ISO date by one period of `frequency`. Weekly adds 7 days;
 * monthly moves to the same day of the next month, clamping to that month's
 * last day (so `2026-01-31 + 1 month = 2026-02-28`). Pure and UTC-stable.
 *
 * Note: because only the resulting (possibly clamped) date is stored, a
 * "31st" schedule that passes through a short month settles to that month's
 * last day and does not climb back to the 31st (e.g. Jan-31 → Feb-28 →
 * Mar-28). The anchor day is intentionally not preserved per the VS-07 design.
 */
export function advanceDueDate(iso: string, frequency: Frequency): string {
  if (frequency === 'weekly') {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return toISODate(d);
  }
  const [year, month, day] = iso.split('-').map(Number);
  const targetMonthIndex = month; // current month is `month - 1`; next is `month`
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Validates and inserts a quick-add template, appended after its siblings via
 * `sort_order`. Returns the new id.
 *
 * @throws if the label is blank, the amount is not a positive integer, or the
 *   category does not exist.
 */
export async function createQuickAddTemplate(input: NewQuickAddTemplate): Promise<number> {
  const label = assertLabel(input.label);
  assertAmount(input.amount);
  await assertCategoryExists(input.categoryId);

  const [{ next }] = await query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM quick_add_templates',
  );
  await execute(
    `INSERT INTO quick_add_templates
       (label, amount, category_id, subcategory_id, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [label, input.amount, input.categoryId, input.subcategoryId ?? null, next, new Date().toISOString()],
  );
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/** Returns every quick-add template ordered by `sort_order, id`. */
export async function getQuickAddTemplates(): Promise<QuickAddTemplate[]> {
  const rows = await query<QuickAddTemplateRow>(
    `SELECT ${QUICK_ADD_COLUMNS} FROM quick_add_templates ORDER BY sort_order, id`,
  );
  return rows.map(mapQuickAddTemplate);
}

/**
 * Updates the touched fields of a quick-add template. No-op on an empty patch.
 *
 * @throws if a touched field fails validation (blank label, bad amount, or
 *   unknown category).
 */
export async function updateQuickAddTemplate(
  id: number,
  patch: Partial<NewQuickAddTemplate>,
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.label !== undefined) {
    sets.push('label = ?');
    params.push(assertLabel(patch.label));
  }
  if (patch.amount !== undefined) {
    assertAmount(patch.amount);
    sets.push('amount = ?');
    params.push(patch.amount);
  }
  if (patch.categoryId !== undefined) {
    await assertCategoryExists(patch.categoryId);
    sets.push('category_id = ?');
    params.push(patch.categoryId);
  }
  if (patch.subcategoryId !== undefined) {
    sets.push('subcategory_id = ?');
    params.push(patch.subcategoryId);
  }
  if (sets.length === 0) return;

  params.push(id);
  await execute(`UPDATE quick_add_templates SET ${sets.join(', ')} WHERE id = ?`, params);
}

/** Hard-deletes a quick-add template; the logged expense is the durable record. */
export async function deleteQuickAddTemplate(id: number): Promise<void> {
  await execute('DELETE FROM quick_add_templates WHERE id = ?', [id]);
}

/**
 * Logs an expense from a template, dated `dateISO` (default: today). The
 * expense duplicates the template's amount/category so it survives template
 * deletion.
 *
 * @throws if the template does not exist.
 */
export async function logFromQuickAddTemplate(id: number, dateISO?: string): Promise<number> {
  const [row] = await query<QuickAddTemplateRow>(
    `SELECT ${QUICK_ADD_COLUMNS} FROM quick_add_templates WHERE id = ?`,
    [id],
  );
  if (!row) {
    throw new Error('Quick-add template not found.');
  }
  return createExpense({
    amount: row.amount,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    note: null,
    date: dateISO ?? toISODate(new Date()),
    isRecurring: false,
  });
}

/**
 * Validates and inserts a recurring expense. Returns the new id.
 *
 * @throws if the label is blank, the amount is invalid, the category is
 *   unknown, the frequency is unsupported, or `nextDueDate` is malformed.
 */
export async function createRecurringExpense(input: NewRecurringExpense): Promise<number> {
  const label = assertLabel(input.label);
  assertAmount(input.amount);
  await assertCategoryExists(input.categoryId);
  assertFrequency(input.frequency);
  assertISODate(input.nextDueDate);

  await execute(
    `INSERT INTO recurring_expenses
       (label, amount, category_id, subcategory_id, frequency, next_due_date, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      label,
      input.amount,
      input.categoryId,
      input.subcategoryId ?? null,
      input.frequency,
      input.nextDueDate,
      input.isActive ? 1 : 0,
      new Date().toISOString(),
    ],
  );
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/** Returns every recurring expense ordered by `next_due_date ASC, id`. */
export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const rows = await query<RecurringExpenseRow>(
    `SELECT ${RECURRING_COLUMNS} FROM recurring_expenses ORDER BY next_due_date ASC, id`,
  );
  return rows.map(mapRecurringExpense);
}

/**
 * Updates the touched fields of a recurring expense. No-op on an empty patch.
 *
 * @throws if a touched field fails validation.
 */
export async function updateRecurringExpense(
  id: number,
  patch: Partial<NewRecurringExpense>,
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.label !== undefined) {
    sets.push('label = ?');
    params.push(assertLabel(patch.label));
  }
  if (patch.amount !== undefined) {
    assertAmount(patch.amount);
    sets.push('amount = ?');
    params.push(patch.amount);
  }
  if (patch.categoryId !== undefined) {
    await assertCategoryExists(patch.categoryId);
    sets.push('category_id = ?');
    params.push(patch.categoryId);
  }
  if (patch.subcategoryId !== undefined) {
    sets.push('subcategory_id = ?');
    params.push(patch.subcategoryId);
  }
  if (patch.frequency !== undefined) {
    assertFrequency(patch.frequency);
    sets.push('frequency = ?');
    params.push(patch.frequency);
  }
  if (patch.nextDueDate !== undefined) {
    assertISODate(patch.nextDueDate);
    sets.push('next_due_date = ?');
    params.push(patch.nextDueDate);
  }
  if (patch.isActive !== undefined) {
    sets.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }
  if (sets.length === 0) return;

  params.push(id);
  await execute(`UPDATE recurring_expenses SET ${sets.join(', ')} WHERE id = ?`, params);
}

/** Toggles a recurring expense's active flag, leaving `next_due_date` untouched. */
export async function setRecurringActive(id: number, isActive: boolean): Promise<void> {
  await execute('UPDATE recurring_expenses SET is_active = ? WHERE id = ?', [
    isActive ? 1 : 0,
    id,
  ]);
}

/** Hard-deletes a recurring expense; already-logged expense rows remain. */
export async function deleteRecurringExpense(id: number): Promise<void> {
  await execute('DELETE FROM recurring_expenses WHERE id = ?', [id]);
}

/**
 * Advances a recurring expense's `next_due_date` by one period without logging
 * an expense — the "skip this occurrence" action.
 *
 * @throws if the row is missing or inactive (skipping an inactive row is
 *   almost certainly a mis-tap; the UI must re-activate first).
 */
export async function skipRecurringOccurrence(id: number): Promise<void> {
  const [row] = await query<RecurringExpenseRow>(
    `SELECT ${RECURRING_COLUMNS} FROM recurring_expenses WHERE id = ?`,
    [id],
  );
  if (!row) {
    throw new Error('Recurring expense not found.');
  }
  if (row.is_active !== 1) {
    throw new Error('Cannot skip an inactive recurring expense — re-activate it first.');
  }
  await execute('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?', [
    advanceDueDate(row.next_due_date, row.frequency),
    id,
  ]);
}

/**
 * Auto-logs every due occurrence of every active recurring expense. For each
 * active row whose `next_due_date <= todayISO`, inserts an expense dated at the
 * due date (so a missed payment lands in the budget month it was due, not the
 * month the app happened to open), then advances the due date — repeating until
 * the next due date is in the future. Idempotent: a second call the same day
 * logs nothing. Each row's insert+advance is wrapped in a transaction so a
 * crash mid-row can't re-log the same occurrence.
 *
 * @param todayISO The cutoff date (default: today). Explicit for testability.
 * @returns the number of expenses logged across all rows.
 */
export async function runRecurringAutoLog(
  todayISO: string = toISODate(new Date()),
): Promise<{ loggedCount: number }> {
  const rows = await query<RecurringExpenseRow>(
    `SELECT ${RECURRING_COLUMNS} FROM recurring_expenses
     WHERE is_active = 1 AND next_due_date <= ?`,
    [todayISO],
  );

  let loggedCount = 0;
  for (const row of rows) {
    let dueDate = row.next_due_date;
    while (dueDate <= todayISO) {
      const advanced = advanceDueDate(dueDate, row.frequency);
      await execute('BEGIN TRANSACTION');
      try {
        await execute(
          `INSERT INTO expenses
             (amount, category_id, subcategory_id, note, date, is_recurring, created_at)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          [
            row.amount,
            row.category_id,
            row.subcategory_id,
            null,
            dueDate,
            new Date().toISOString(),
          ],
        );
        await execute('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?', [
          advanced,
          row.id,
        ]);
        await execute('COMMIT');
      } catch (error) {
        await execute('ROLLBACK');
        throw error;
      }
      loggedCount += 1;
      dueDate = advanced;
    }
  }
  return { loggedCount };
}

// ---- VS-17: expense edit & delete ------------------------------------------

/**
 * Returns a single expense by id, or null if not found.
 */
export async function getExpenseById(id: number): Promise<Expense | null> {
  const rows = await query<ExpenseRow>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows.length > 0 ? mapExpense(rows[0]) : null;
}

/**
 * Updates mutable fields on an expense. Throws if no row exists for `id`.
 * Fields not included in `fields` are left unchanged (partial UPDATE).
 */
export async function updateExpense(
  id: number,
  fields: Partial<Pick<Expense, 'amount' | 'categoryId' | 'subcategoryId' | 'note' | 'date' | 'accountId'>>,
): Promise<void> {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (fields.amount !== undefined) {
    if (!Number.isInteger(fields.amount) || fields.amount <= 0) {
      throw new Error('Expense amount must be a positive integer (FCFA).');
    }
    sets.push('amount = ?');
    params.push(fields.amount);
  }
  if (fields.categoryId !== undefined) {
    sets.push('category_id = ?');
    params.push(fields.categoryId);
  }
  if (fields.subcategoryId !== undefined) {
    sets.push('subcategory_id = ?');
    params.push(fields.subcategoryId);
  }
  if ('note' in fields) {
    sets.push('note = ?');
    params.push(fields.note ?? null);
  }
  if (fields.date !== undefined) {
    sets.push('date = ?');
    params.push(fields.date);
  }
  if ('accountId' in fields) {
    sets.push('account_id = ?');
    params.push(fields.accountId ?? null);
  }
  if (sets.length === 0) return;

  const [existing] = await query<{ id: number }>('SELECT id FROM expenses WHERE id = ?', [id]);
  if (!existing) throw new Error('Expense not found.');

  params.push(id);
  await execute(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`, params);
}

/**
 * Deletes an expense by id. Throws if no row exists for `id`.
 */
export async function deleteExpense(id: number): Promise<void> {
  const [existing] = await query<{ id: number }>('SELECT id FROM expenses WHERE id = ?', [id]);
  if (!existing) throw new Error('Expense not found.');
  await execute('DELETE FROM expenses WHERE id = ?', [id]);
}

// ---- VS-08: zero-day confirmation ------------------------------------------

/**
 * Records that the user spent nothing on `dateISO` (default: today). Idempotent
 * via the `zero_days.date` UNIQUE constraint — a repeat confirmation of the same
 * day is ignored rather than duplicated.
 */
export async function confirmZeroDay(dateISO: string = toISODate(new Date())): Promise<void> {
  assertISODate(dateISO);
  await execute('INSERT OR IGNORE INTO zero_days (date, confirmed_at) VALUES (?, ?)', [
    dateISO,
    new Date().toISOString(),
  ]);
}

/** Whether the given day (default: today) has an explicit zero-day confirmation. */
export async function isZeroDayConfirmed(
  dateISO: string = toISODate(new Date()),
): Promise<boolean> {
  const [row] = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM zero_days WHERE date = ?',
    [dateISO],
  );
  return row.count > 0;
}

/** Whether any expense is logged on the given day (default: today). */
export async function hasExpensesOn(
  dateISO: string = toISODate(new Date()),
): Promise<boolean> {
  const [row] = await query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM expenses WHERE date = ?',
    [dateISO],
  );
  return row.count > 0;
}

/**
 * Returns whether the given day (default: today) already has activity that
 * should suppress the zero-day prompt — a logged expense or a confirmation.
 */
export async function getDayActivityStatus(
  dateISO: string = toISODate(new Date()),
): Promise<DayActivityStatus> {
  return {
    hasExpenses: await hasExpensesOn(dateISO),
    zeroDayConfirmed: await isZeroDayConfirmed(dateISO),
  };
}
