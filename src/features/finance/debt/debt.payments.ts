import i18n from 'i18next';

import { execute, query } from '@/services/database';

import { instalmentAmounts } from './debt.terms';
import type { DebtPayment, NewDebtPayment } from './debt.types';

/** What payment rules need about a debt; `amount` is the repayable total. */
interface DebtBalance {
  amount: number;
  status: 'pending' | 'settled';
  paid: number;
  count: number | null;
  frequency: string | null;
  first_date: string | null;
}

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
  instalment: number | null;
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
    instalment: row.instalment,
  };
}

/**
 * A live debt's repayable total (`total_to_repay ?? amount`, VS-54), status,
 * what its live repayments add up to and its schedule; null when gone.
 */
async function debtBalance(debtId: number): Promise<DebtBalance | null> {
  const [row] = await query<DebtBalance>(
    `SELECT COALESCE(d.total_to_repay, d.amount) AS amount, d.status,
       d.instalment_count AS count, d.instalment_frequency AS frequency, d.first_instalment_date AS first_date,
       (SELECT COALESCE(SUM(p.amount), 0) FROM debt_payments p
         WHERE p.debt_id = d.id AND p.deleted_at IS NULL) AS paid
     FROM debts d WHERE d.id = ? AND d.deleted_at IS NULL`,
    [debtId],
  );
  return row ?? null;
}

/** A validation error in the active UI language. */
function err(
  key: 'paymentAmount' | 'paymentDate' | 'debtClosed' | 'paymentTooLarge' | 'instalmentInvalid' | 'instalmentPaid',
): Error {
  return new Error(i18n.t(`errors.${key}`, { ns: 'debt' }));
}

/** The live repayments of a debt, newest first. */
export async function getDebtPayments(debtId: number): Promise<DebtPayment[]> {
  const rows = await query<PaymentRow>(
    `SELECT id, debt_id, amount, account_id, date, note, created_at, instalment FROM debt_payments
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
  instalment: number | null = null,
): Promise<void> {
  if (!Number.isInteger(payment.amount) || payment.amount <= 0) throw err('paymentAmount');
  if (!ISO_DATE.test(payment.date)) throw err('paymentDate');

  const debt = await debtBalance(debtId);
  if (!debt || debt.status !== 'pending') throw err('debtClosed');
  const outstanding = debt.amount - debt.paid;
  if (payment.amount > outstanding) throw err('paymentTooLarge');

  await execute(
    `INSERT INTO debt_payments (debt_id, amount, account_id, date, note, created_at, instalment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      debtId,
      payment.amount,
      payment.accountId,
      payment.date,
      payment.note?.trim() || null,
      new Date().toISOString(),
      instalment,
    ],
  );

  if (payment.amount === outstanding) {
    await execute(
      "UPDATE debts SET status = 'settled', settled_at = ? WHERE id = ? AND status = 'pending'",
      [settledAtISO, debtId],
    );
  }
}

/**
 * Pays instalment `n` of a scheduled debt (VS-54): a repayment of that
 * instalment's amount, through `accountId`, tied to it so it can be undone
 * exactly. Capped at what is still owed, should free repayments have covered
 * part of it. Paying the last of what is owed settles the debt.
 *
 * @throws without a schedule, for an instalment outside it, or one already paid.
 */
export async function payInstalment(
  debtId: number,
  n: number,
  accountId: number | null,
  date: string,
): Promise<void> {
  const debt = await debtBalance(debtId);
  if (!debt || debt.status !== 'pending') throw err('debtClosed');
  if (debt.count === null || !Number.isInteger(n) || n < 1 || n > debt.count) throw err('instalmentInvalid');
  const [taken] = await query<{ n: number }>(
    'SELECT COUNT(*) AS n FROM debt_payments WHERE debt_id = ? AND instalment = ? AND deleted_at IS NULL',
    [debtId, n],
  );
  if (taken.n > 0) throw err('instalmentPaid');
  const amount = Math.min(instalmentAmounts(debt.amount, debt.count)[n - 1], debt.amount - debt.paid);
  await recordDebtPayment(debtId, { amount, accountId, date }, new Date().toISOString(), n);
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
