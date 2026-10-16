import i18n from 'i18next';

import { execute, query } from '@/services/database';

import type { DebtPayment, NewDebtPayment } from './debt.types';

/**
 * Repayments (VS-44). Each one records how much came back (or went back) and
 * the wallet it went through, so a debt repaid in three instalments keeps all
 * three instead of having its amount overwritten. Repayments never count as
 * income or spending; only wallet balances read them.
 *
 * Removal is a soft delete (`deleted_at`): the sync engine never sends
 * deletions, so a hard-deleted repayment would come back on the next restore.
 *
 * This module looks debts up itself rather than importing `debt.service`, which
 * imports it for `settleDebt`.
 */

interface PaymentRow {
  id: number;
  debt_id: number;
  amount: number;
  account_id: number | null;
  date: string;
  note: string | null;
  created_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function mapPayment(row: PaymentRow): DebtPayment {
  return {
    id: row.id,
    debtId: row.debt_id,
    amount: row.amount,
    accountId: row.account_id,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

/** A live debt's amount, status and what its live repayments add up to; null when gone. */
async function debtBalance(
  debtId: number,
): Promise<{ amount: number; status: 'pending' | 'settled'; paid: number } | null> {
  const [row] = await query<{ amount: number; status: 'pending' | 'settled'; paid: number }>(
    `SELECT d.amount, d.status,
       (SELECT COALESCE(SUM(p.amount), 0) FROM debt_payments p
         WHERE p.debt_id = d.id AND p.deleted_at IS NULL) AS paid
     FROM debts d WHERE d.id = ? AND d.deleted_at IS NULL`,
    [debtId],
  );
  return row ?? null;
}

/** A validation error in the active UI language. */
function err(key: 'paymentAmount' | 'paymentDate' | 'debtClosed' | 'paymentTooLarge'): Error {
  return new Error(i18n.t(`errors.${key}`, { ns: 'debt' }));
}

/** The live repayments of a debt, newest first. */
export async function getDebtPayments(debtId: number): Promise<DebtPayment[]> {
  const rows = await query<PaymentRow>(
    `SELECT id, debt_id, amount, account_id, date, note, created_at FROM debt_payments
     WHERE debt_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC`,
    [debtId],
  );
  return rows.map(mapPayment);
}

/**
 * Records a repayment on an open debt. A repayment that brings what is owed to
 * zero settles the debt, stamped `settledAtISO` (default: now).
 *
 * @throws if the debt is missing, removed or already settled; the amount is
 *   not a positive whole number or exceeds what is still owed; or the date is
 *   not `YYYY-MM-DD`.
 */
export async function recordDebtPayment(
  debtId: number,
  payment: NewDebtPayment,
  settledAtISO: string = new Date().toISOString(),
): Promise<void> {
  if (!Number.isInteger(payment.amount) || payment.amount <= 0) throw err('paymentAmount');
  if (!ISO_DATE.test(payment.date)) throw err('paymentDate');

  const debt = await debtBalance(debtId);
  if (!debt || debt.status !== 'pending') throw err('debtClosed');
  const outstanding = debt.amount - debt.paid;
  if (payment.amount > outstanding) throw err('paymentTooLarge');

  await execute(
    `INSERT INTO debt_payments (debt_id, amount, account_id, date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [debtId, payment.amount, payment.accountId, payment.date, payment.note?.trim() || null, new Date().toISOString()],
  );

  if (payment.amount === outstanding) {
    await execute(
      "UPDATE debts SET status = 'settled', settled_at = ? WHERE id = ? AND status = 'pending'",
      [settledAtISO, debtId],
    );
  }
}

/**
 * Removes a repayment (soft delete). A settled debt that is no longer covered
 * reopens, so the outstanding figure and reminders come back.
 */
export async function removeDebtPayment(paymentId: number): Promise<void> {
  const [row] = await query<{ debt_id: number }>(
    'SELECT debt_id FROM debt_payments WHERE id = ? AND deleted_at IS NULL',
    [paymentId],
  );
  if (!row) return;

  await execute('UPDATE debt_payments SET deleted_at = ? WHERE id = ?', [
    new Date().toISOString(),
    paymentId,
  ]);

  const debt = await debtBalance(row.debt_id);
  if (debt && debt.status === 'settled' && debt.paid < debt.amount) {
    await execute("UPDATE debts SET status = 'pending', settled_at = NULL WHERE id = ?", [row.debt_id]);
  }
}
