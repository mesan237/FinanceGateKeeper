import type { DebtDirection } from '@/constants/debt';
import { DEBT_DUE_SOON_DAYS } from '@/constants/debt';
import { execute, query } from '@/services/database';
import { daysBetween, toISODate } from '@/utils/formatDate';

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
}

const DEBT_COLUMNS =
  'id, person_name, amount, direction, date, due_date, status, note, settled_at, created_at';

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
  };
}

/** Reads a debt by id, or `null` if no such row exists. */
export async function getDebtById(id: number): Promise<Debt | null> {
  const rows = await query<DebtRow>(`SELECT ${DEBT_COLUMNS} FROM debts WHERE id = ?`, [id]);
  return rows[0] ? mapDebt(rows[0]) : null;
}

/**
 * Reads all debts in one direction, pending first (settled last), then by due
 * date (debts without a due date sort after those with one), then newest.
 */
export async function getDebts(direction: DebtDirection): Promise<Debt[]> {
  const rows = await query<DebtRow>(
    `SELECT ${DEBT_COLUMNS} FROM debts
     WHERE direction = ?
     ORDER BY status ASC, (due_date IS NULL) ASC, due_date ASC, created_at DESC`,
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
  if (!personName) throw new Error('Person name is required.');
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Debt amount must be a positive integer.');
  }
  const date = input.date ?? toISODate(new Date());
  await execute(
    `INSERT INTO debts (person_name, amount, direction, date, due_date, status, note, settled_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`,
    [
      personName,
      input.amount,
      input.direction,
      date,
      input.dueDate ?? null,
      input.note ?? null,
      new Date().toISOString(),
    ],
  );
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return id;
}

/**
 * Marks a debt settled, stamping `settled_at`. Idempotent — a debt that is
 * already settled keeps its original `settled_at` (the WHERE guards on status).
 */
export async function settleDebt(
  id: number,
  settledAtISO: string = new Date().toISOString(),
): Promise<void> {
  await execute(
    "UPDATE debts SET status = 'settled', settled_at = ? WHERE id = ? AND status = 'pending'",
    [settledAtISO, id],
  );
}

/** Updates a debt's person, amount, due date, and/or note. Leaves status untouched. */
export async function updateDebt(id: number, patch: DebtPatch): Promise<void> {
  const debt = await getDebtById(id);
  if (!debt) throw new Error(`Debt ${id} does not exist.`);
  const personName = patch.personName === undefined ? debt.personName : patch.personName.trim();
  if (!personName) throw new Error('Person name is required.');
  const amount = patch.amount === undefined ? debt.amount : patch.amount;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Debt amount must be a positive integer.');
  }
  const dueDate = patch.dueDate === undefined ? debt.dueDate : patch.dueDate;
  const note = patch.note === undefined ? debt.note : patch.note;
  await execute('UPDATE debts SET person_name = ?, amount = ?, due_date = ?, note = ? WHERE id = ?', [
    personName,
    amount,
    dueDate,
    note,
    id,
  ]);
}

/** Deletes a debt row. */
export async function deleteDebt(id: number): Promise<void> {
  await execute('DELETE FROM debts WHERE id = ?', [id]);
}

/** Sums pending (outstanding) amounts per direction; settled debts are excluded. */
export async function getOutstandingTotals(): Promise<OutstandingTotals> {
  const rows = await query<{ direction: DebtDirection; total: number }>(
    `SELECT direction, SUM(amount) AS total FROM debts
     WHERE status = 'pending' GROUP BY direction`,
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
    `SELECT ${DEBT_COLUMNS} FROM debts
     WHERE status = 'pending' AND due_date IS NOT NULL`,
  );
  const reminders: DebtReminder[] = [];
  for (const row of rows) {
    const dueDate = row.due_date as string;
    const daysUntil = daysBetween(todayISO, dueDate);
    if (daysUntil < 0) {
      reminders.push({ debtId: row.id, personName: row.person_name, amount: row.amount, dueDate, kind: 'overdue' });
    } else if (daysUntil <= DEBT_DUE_SOON_DAYS) {
      reminders.push({ debtId: row.id, personName: row.person_name, amount: row.amount, dueDate, kind: 'dueSoon' });
    }
  }
  return reminders;
}
