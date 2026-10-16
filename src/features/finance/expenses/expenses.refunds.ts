import i18n from 'i18next';

import { execute, query } from '@/services/database';

import type { NewRefund, Refund } from './expenses.types';

/**
 * Refunds (VS-45). A refund is an expense row with a negative amount whose
 * `refund_of` names the purchase it refunds, in the purchase's category and
 * dated the day the money came back. Every total that sums expenses — month
 * spend, envelopes, reports, averages, wallet balances — therefore nets it out
 * in the month of the refund, with no second ledger to keep in step.
 *
 * Removal is a plain DELETE, like any expense: expenses have no soft delete,
 * and a refund is one.
 */

interface RefundRow {
  id: number;
  amount: number;
  account_id: number | null;
  date: string;
  note: string | null;
  created_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A validation error in the active UI language. */
function err(key: 'refundAmount' | 'refundDate' | 'refundTooLarge' | 'refundTarget'): Error {
  return new Error(i18n.t(`errors.${key}`, { ns: 'expenses' }));
}

/** Sum of the refunds already recorded against `expenseId`, as a positive amount. */
export async function getRefundedTotal(expenseId: number): Promise<number> {
  const [row] = await query<{ total: number }>(
    'SELECT COALESCE(-SUM(amount), 0) AS total FROM expenses WHERE refund_of = ?',
    [expenseId],
  );
  return row.total;
}

/** The refunds of a purchase, newest first, each amount positive. */
export async function getRefunds(expenseId: number): Promise<Refund[]> {
  const rows = await query<RefundRow>(
    `SELECT id, amount, account_id, date, note, created_at FROM expenses
     WHERE refund_of = ? ORDER BY date DESC, created_at DESC`,
    [expenseId],
  );
  return rows.map((row) => ({
    id: row.id,
    expenseId,
    amount: -row.amount,
    accountId: row.account_id,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  }));
}

/**
 * Records money coming back for a purchase: a negative expense row in the
 * purchase's category, credited to `accountId`.
 *
 * @throws if the purchase is missing or is itself a refund; the amount is not
 *   a positive whole number or exceeds what is left to refund; or the date is
 *   not `YYYY-MM-DD`.
 */
export async function recordRefund(expenseId: number, refund: NewRefund): Promise<void> {
  if (!Number.isInteger(refund.amount) || refund.amount <= 0) throw err('refundAmount');
  if (!ISO_DATE.test(refund.date)) throw err('refundDate');

  const [purchase] = await query<{
    amount: number;
    category_id: number;
    subcategory_id: number | null;
    refund_of: number | null;
  }>('SELECT amount, category_id, subcategory_id, refund_of FROM expenses WHERE id = ?', [expenseId]);
  if (!purchase || purchase.refund_of !== null || purchase.amount <= 0) throw err('refundTarget');
  if (refund.amount > purchase.amount - (await getRefundedTotal(expenseId))) throw err('refundTooLarge');

  await execute(
    `INSERT INTO expenses
       (amount, category_id, subcategory_id, note, date, is_recurring, account_id, is_unplanned, refund_of, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?)`,
    [
      -refund.amount,
      purchase.category_id,
      purchase.subcategory_id,
      refund.note?.trim() || null,
      refund.date,
      refund.accountId,
      expenseId,
      new Date().toISOString(),
    ],
  );
}

/** Deletes a refund. A no-op for an id that is not a refund. */
export async function removeRefund(refundId: number): Promise<void> {
  await execute('DELETE FROM expenses WHERE id = ? AND refund_of IS NOT NULL', [refundId]);
}
