import i18n from 'i18next';

import type { DebtDirection } from '@/constants/debt';
import { DEBT_DUE_SOON_DAYS } from '@/constants/debt';
import { execute, query } from '@/services/database';
import { daysBetween, toISODate } from '@/utils/formatDate';

import { recordDebtPayment } from './debt.payments';
import type { Debt, DebtPatch, DebtReminder, NewDebt, OutstandingTotals } from './debt.types';

interface DebtRow {
  id: number;
  person_name: string;
  amount: number;
  direction: DebtDirection;
  date: string;
  due_date: string | null;
  status: 'pending' | 'settled';
  note: string | null;
  settled_at: string | null;
  created_at: string;
  account_id: number | null;
  paid: number;
}

/**
 * Every live debt with what its live repayments add up to (VS-44). Removed
 * debts never appear: removal is a soft delete so it syncs.
 */
const DEBT_SELECT = `SELECT d.id, d.person_name, d.amount, d.direction, d.date, d.due_date,
    d.status, d.note, d.settled_at, d.created_at, d.account_id,
    (SELECT COALESCE(SUM(p.amount), 0) FROM debt_payments p
      WHERE p.debt_id = d.id AND p.deleted_at IS NULL) AS paid
  FROM debts d WHERE d.deleted_at IS NULL`;

function mapDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    personName: row.person_name,
    amount: row.amount,
    direction: row.direction,
    date: row.date,
    dueDate: row.due_date,
    status: row.status,
    note: row.note,
    settledAt: row.settled_at,
    createdAt: row.created_at,
    accountId: row.account_id,
    paid: row.paid,
    outstanding: row.status === 'settled' ? 0 : Math.max(0, row.amount - row.paid),
  };
}

/** Reads a debt by id, or `null` if no such row exists. */
export async function getDebtById(id: number): Promise<Debt | null> {
  const rows = await query<DebtRow>(`${DEBT_SELECT} AND d.id = ?`, [id]);
  return rows[0] ? mapDebt(rows[0]) : null;
}

/**
 * Reads all debts in one direction, pending first (settled last), then by due
 * date (debts without a due date sort after those with one), then newest.
 */
export async function getDebts(direction: DebtDirection): Promise<Debt[]> {
  const rows = await query<DebtRow>(
    `${DEBT_SELECT} AND d.direction = ?
     ORDER BY d.status ASC, (d.due_date IS NULL) ASC, d.due_date ASC, d.created_at DESC`,
    [direction],
  );
  return rows.map(mapDebt);
}

/**
 * Creates a pending debt. The person name must be non-empty and the amount a
 * positive integer; `date` defaults to today.
 *
 * @returns the new debt's id.
 */
export async function createDebt(input: NewDebt): Promise<number> {
  const personName = input.personName.trim();
  if (!personName) throw new Error(i18n.t('errors.personRequired', { ns: 'debt' }));
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error(i18n.t('errors.amountPositive', { ns: 'debt' }));
  }
  const date = input.date ?? toISODate(new Date());
  await execute(
    `INSERT INTO debts (person_name, amount, direction, date, due_date, status, note, settled_at, account_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?, ?)`,
    [
      personName,
      input.amount,
      input.direction,
      date,
      input.dueDate ?? null,
      input.note ?? null,
      input.accountId ?? null,
      new Date().toISOString(),
    ],
  );
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return id;
}

/**
 * Marks a debt settled, stamping `settled_at`. Idempotent — a debt that is
 * already settled keeps its original `settled_at` (the WHERE guards on status).
 *
 * Whatever is still owed is first recorded as the final repayment, dated the
 * day of `settledAtISO` and through `accountId` (VS-44), so "settle" moves
 * the same money a last instalment would.
 */
export async function settleDebt(
  id: number,
  settledAtISO: string = new Date().toISOString(),
  accountId: number | null = null,
): Promise<void> {
  const debt = await getDebtById(id);
  if (debt && debt.status === 'pending' && debt.outstanding > 0) {
    await recordDebtPayment(
      id,
      { amount: debt.outstanding, accountId, date: settledAtISO.slice(0, 10) },
      settledAtISO,
    );
  }
  await execute(
    "UPDATE debts SET status = 'settled', settled_at = ? WHERE id = ? AND status = 'pending'",
    [settledAtISO, id],
  );
}

/** Updates a debt's person, amount, due date, and/or note. Leaves status untouched. */
export async function updateDebt(id: number, patch: DebtPatch): Promise<void> {
  const debt = await getDebtById(id);
  if (!debt) throw new Error(i18n.t('errors.notExist', { ns: 'debt', id: String(id) }));
  const personName = patch.personName === undefined ? debt.personName : patch.personName.trim();
  if (!personName) throw new Error(i18n.t('errors.personRequired', { ns: 'debt' }));
  const amount = patch.amount === undefined ? debt.amount : patch.amount;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(i18n.t('errors.amountPositive', { ns: 'debt' }));
  }
  // Repayments are history: the debt cannot shrink below what came back (VS-44).
  if (amount < debt.paid) throw new Error(i18n.t('errors.belowRepaid', { ns: 'debt' }));
  const dueDate = patch.dueDate === undefined ? debt.dueDate : patch.dueDate;
  const note = patch.note === undefined ? debt.note : patch.note;
  const accountId = patch.accountId === undefined ? debt.accountId : patch.accountId;
  await execute(
    'UPDATE debts SET person_name = ?, amount = ?, due_date = ?, note = ?, account_id = ? WHERE id = ?',
    [personName, amount, dueDate, note, accountId, id],
  );
}

/**
 * Removes a debt. Soft delete (VS-44): the debt now moves wallet money, and a
 * hard-deleted row would come back on the next restore and move it again. Its
 * repayments stop counting with it.
 */
export async function deleteDebt(id: number): Promise<void> {
  await execute('UPDATE debts SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    new Date().toISOString(),
    id,
  ]);
}

/**
 * Sums what is still owed per direction — each pending debt's amount less its
 * repayments. Settled and removed debts are excluded.
 */
export async function getOutstandingTotals(): Promise<OutstandingTotals> {
  const rows = await query<{ direction: DebtDirection; total: number }>(
    `SELECT direction, SUM(amount - paid) AS total FROM (${DEBT_SELECT} AND d.status = 'pending')
     GROUP BY direction`,
  );
  const totals: OutstandingTotals = { lent: 0, owed: 0 };
  for (const row of rows) totals[row.direction] = row.total;
  return totals;
}

/**
 * Returns the pending debts whose due date warrants a reminder, classified
 * `dueSoon` (due today through `DEBT_DUE_SOON_DAYS` ahead) or `overdue` (past
 * the due date). Debts due further out, settled debts, and debts with no due
 * date are excluded. Day math is UTC-stable via `daysBetween`.
 */
export async function getDueReminders(
  todayISO: string = toISODate(new Date()),
): Promise<DebtReminder[]> {
  const rows = await query<DebtRow>(
    `${DEBT_SELECT} AND d.status = 'pending' AND d.due_date IS NOT NULL`,
  );
  const reminders: DebtReminder[] = [];
  for (const row of rows) {
    const dueDate = row.due_date as string;
    const daysUntil = daysBetween(todayISO, dueDate);
    if (daysUntil < 0) {
      reminders.push({ debtId: row.id, personName: row.person_name, amount: row.amount - row.paid, dueDate, kind: 'overdue' });
    } else if (daysUntil <= DEBT_DUE_SOON_DAYS) {
      reminders.push({ debtId: row.id, personName: row.person_name, amount: row.amount - row.paid, dueDate, kind: 'dueSoon' });
    }
  }
  return reminders;
}
