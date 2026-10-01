import i18n from 'i18next';

import { createExpense, deleteExpense } from '@/features/finance/expenses/expenses.service';
import { execute } from '@/services/database';

import { getItem } from './planned.service';

/**
 * Ticking an item off (VS-36): turning a planned item into a real expense, and
 * undoing it. Kept apart from `planned.service` because these two operations
 * are the only place `planned` reaches into `expenses`.
 */

/** What the user confirms in the purchase sheet before an expense is created. */
export interface PurchaseDetails {
  /** The amount actually paid, in whole FCFA — not necessarily the estimate. */
  amount: number;
  accountId: number | null;
  /** `YYYY-MM-DD`. */
  date: string;
}

/**
 * Runs `work` inside a SQLite transaction: both writes of a tick land, or
 * neither does. A half-done tick would leave an expense with no link, and
 * ticking the item again would then record the purchase twice.
 */
async function inTransaction<T>(work: () => Promise<T>): Promise<T> {
  await execute('BEGIN TRANSACTION');
  try {
    const result = await work();
    await execute('COMMIT');
    return result;
  } catch (e) {
    try {
      await execute('ROLLBACK');
    } catch {
      // SQLite may already have rolled back (e.g. after a constraint abort).
      // Never let that hide the error that got us here.
    }
    throw e;
  }
}

// There is one shared connection, so a second BEGIN while one is open fails with
// a raw SQLite error, and a second tick of the same item would race the first
// one's check. Ticks and undos therefore run strictly one after another.
let queue: Promise<unknown> = Promise.resolve();

/** Runs `work` after every earlier tick/undo has settled; one failure does not block the next. */
function inSequence<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Records the purchase of a planned item: creates an ordinary expense with the
 * confirmed details (named after the item, in the item's category) and links
 * the item to it. Returns the new expense's id.
 *
 * @throws if the item does not exist, is already bought, or the expense fails
 * validation (e.g. a zero amount).
 */
export function markBought(itemId: number, details: PurchaseDetails): Promise<number> {
  return inSequence(async () => {
    const item = await getItem(itemId);
    if (!item) throw new Error(i18n.t('errors.itemNotFound', { ns: 'planned' }));
    if (item.isBought) throw new Error(i18n.t('errors.alreadyBought', { ns: 'planned' }));

    return inTransaction(async () => {
      const expenseId = await createExpense({
        amount: details.amount,
        categoryId: item.categoryId,
        subcategoryId: null,
        note: item.name,
        date: details.date,
        isRecurring: false,
        accountId: details.accountId,
      });
      await execute('UPDATE planned_items SET expense_id = ? WHERE id = ?', [expenseId, itemId]);
      return expenseId;
    });
  });
}

/**
 * Undoes a purchase: deletes the expense the item created and reopens the item.
 *
 * @throws if the item does not exist or is not bought.
 */
export function unmarkBought(itemId: number): Promise<void> {
  return inSequence(async () => {
    const item = await getItem(itemId);
    if (!item) throw new Error(i18n.t('errors.itemNotFound', { ns: 'planned' }));
    if (!item.isBought || item.expenseId === null) {
      throw new Error(i18n.t('errors.notBought', { ns: 'planned' }));
    }
    const expenseId = item.expenseId;

    await inTransaction(async () => {
      await deleteExpense(expenseId);
      await execute('UPDATE planned_items SET expense_id = NULL WHERE id = ?', [itemId]);
    });
  });
}
