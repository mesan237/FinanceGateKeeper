import i18n from 'i18next';

import type { planned as plannedCopy } from '@/i18n/locales/en/planned';
import { execute, query } from '@/services/database';

import type {
  NewPlannedItem,
  PlannedItem,
  PlannedItemPatch,
  PlannedList,
} from './planned.types';

type PlannedErrorKey = keyof (typeof plannedCopy)['errors'];

/** A validation message in the active UI language — thrown errors reach the screen as-is. */
function err(key: PlannedErrorKey): string {
  return i18n.t(`errors.${key}`, { ns: 'planned' });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---- Validation -------------------------------------------------------------

/** Returns the trimmed name, or throws if it is blank. */
function cleanName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error(err('nameRequired'));
  return trimmed;
}

/** Throws unless `amount` is a whole, positive number of FCFA. */
function assertEstimate(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(err('amountWhole'));
}

/** Throws unless `date` is null/undefined or matches `YYYY-MM-DD`. */
function assertOptionalDate(date: string | null | undefined): void {
  if (date != null && !ISO_DATE.test(date)) throw new Error(err('dateFormat'));
}

/** Throws unless a list with `id` exists. */
async function assertListExists(id: number): Promise<void> {
  const [row] = await query<{ id: number }>('SELECT id FROM planned_lists WHERE id = ?', [id]);
  if (!row) throw new Error(err('listNotFound'));
}

/** Throws unless an item with `id` exists. */
async function assertItemExists(id: number): Promise<void> {
  const [row] = await query<{ id: number }>('SELECT id FROM planned_items WHERE id = ?', [id]);
  if (!row) throw new Error(err('itemNotFound'));
}

/** Id of the row the last INSERT created. */
async function lastInsertId(): Promise<number> {
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

// ---- Lists ------------------------------------------------------------------

interface ListRow {
  id: number;
  name: string;
  open_count: number;
  open_estimate: number;
  created_at: string;
}

/** Every list, oldest first, each with how many items are still to buy and their estimate. */
export async function getLists(): Promise<PlannedList[]> {
  const rows = await query<ListRow>(
    `SELECT l.id, l.name, l.created_at,
            COALESCE(SUM(CASE WHEN i.id IS NOT NULL AND e.id IS NULL THEN 1 ELSE 0 END), 0)
              AS open_count,
            COALESCE(SUM(CASE WHEN i.id IS NOT NULL AND e.id IS NULL
                              THEN i.estimated_amount ELSE 0 END), 0) AS open_estimate
       FROM planned_lists l
       LEFT JOIN planned_items i ON i.list_id = l.id
       LEFT JOIN expenses e ON e.id = i.expense_id
      GROUP BY l.id
      ORDER BY l.id`,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    openCount: r.open_count,
    openEstimate: r.open_estimate,
    createdAt: r.created_at,
  }));
}

/**
 * Creates a list and returns its id.
 *
 * @throws if `name` is blank.
 */
export async function createList(name: string): Promise<number> {
  const clean = cleanName(name);
  await execute('INSERT INTO planned_lists (name, created_at) VALUES (?, ?)', [
    clean,
    new Date().toISOString(),
  ]);
  return lastInsertId();
}

/**
 * Renames a list.
 *
 * @throws if `name` is blank or the list does not exist.
 */
export async function renameList(id: number, name: string): Promise<void> {
  const clean = cleanName(name);
  await assertListExists(id);
  await execute('UPDATE planned_lists SET name = ? WHERE id = ?', [clean, id]);
}

/**
 * Deletes a list and its items. Expenses already created by bought items stay —
 * they are real spending.
 *
 * @throws if the list does not exist.
 */
export async function deleteList(id: number): Promise<void> {
  await assertListExists(id);
  // Explicit, so it does not depend on the connection enforcing foreign keys.
  await execute('DELETE FROM planned_items WHERE list_id = ?', [id]);
  await execute('DELETE FROM planned_lists WHERE id = ?', [id]);
}

// ---- Items ------------------------------------------------------------------

interface ItemRow {
  id: number;
  list_id: number;
  name: string;
  estimated_amount: number;
  category_id: number;
  account_id: number | null;
  planned_date: string | null;
  expense_id: number | null;
  bought_amount: number | null;
  created_at: string;
}

function mapItem(row: ItemRow): PlannedItem {
  // Bought means the linked expense still exists: a dangling expense_id (the
  // expense was deleted on a connection that does not enforce FKs) reads as
  // planned, because the joined amount comes back null.
  const isBought = row.bought_amount !== null;
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    estimatedAmount: row.estimated_amount,
    categoryId: row.category_id,
    accountId: row.account_id,
    plannedDate: row.planned_date,
    expenseId: isBought ? row.expense_id : null,
    isBought,
    boughtAmount: row.bought_amount,
    createdAt: row.created_at,
  };
}

/** The items of one list in the order they were added, with bought state read from the expense. */
export async function getItems(listId: number): Promise<PlannedItem[]> {
  const rows = await query<ItemRow>(
    `SELECT i.id, i.list_id, i.name, i.estimated_amount, i.category_id, i.account_id,
            i.planned_date, i.expense_id, i.created_at, e.amount AS bought_amount
       FROM planned_items i
       LEFT JOIN expenses e ON e.id = i.expense_id
      WHERE i.list_id = ?
      ORDER BY i.id`,
    [listId],
  );
  return rows.map(mapItem);
}

/**
 * Adds an item to a list and returns its id.
 *
 * @throws if the name is blank, the estimate is not a positive whole number,
 * the date is malformed, or the list does not exist.
 */
export async function createItem(input: NewPlannedItem): Promise<number> {
  const name = cleanName(input.name);
  assertEstimate(input.estimatedAmount);
  assertOptionalDate(input.plannedDate);
  await assertListExists(input.listId);

  await execute(
    `INSERT INTO planned_items
       (list_id, name, estimated_amount, category_id, account_id, planned_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.listId,
      name,
      input.estimatedAmount,
      input.categoryId,
      input.accountId ?? null,
      input.plannedDate ?? null,
      new Date().toISOString(),
    ],
  );
  return lastInsertId();
}

/**
 * Updates the fields present in `patch`; omitted fields are left as they are.
 * Passing `null` for `accountId` or `plannedDate` clears it.
 *
 * @throws if the item does not exist or a passed value fails validation.
 */
export async function updateItem(id: number, patch: PlannedItemPatch): Promise<void> {
  await assertItemExists(id);

  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(cleanName(patch.name));
  }
  if (patch.estimatedAmount !== undefined) {
    assertEstimate(patch.estimatedAmount);
    sets.push('estimated_amount = ?');
    params.push(patch.estimatedAmount);
  }
  if (patch.categoryId !== undefined) {
    sets.push('category_id = ?');
    params.push(patch.categoryId);
  }
  if (patch.accountId !== undefined) {
    sets.push('account_id = ?');
    params.push(patch.accountId);
  }
  if (patch.plannedDate !== undefined) {
    assertOptionalDate(patch.plannedDate);
    sets.push('planned_date = ?');
    params.push(patch.plannedDate);
  }
  if (sets.length === 0) return;

  await execute(`UPDATE planned_items SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
}

/**
 * Deletes an item. A linked expense, if any, is left alone.
 *
 * @throws if the item does not exist.
 */
export async function deleteItem(id: number): Promise<void> {
  await assertItemExists(id);
  await execute('DELETE FROM planned_items WHERE id = ?', [id]);
}
