import { DEBT_DUE_SOON_DAYS } from '@/constants/debt';
import { daysBetween } from '@/utils/formatDate';

import { buildInstalments } from './debt.terms';
import type { Debt, DebtPayment, DebtReminder } from './debt.types';

/**
 * Which reminders one pending debt calls for today. Pure.
 *
 * - Without instalments: its due date — `dueSoon` from `DEBT_DUE_SOON_DAYS`
 *   before, `overdue` after — for what is still owed (as before VS-55).
 * - With instalments (VS-55): its overdue instalments grouped into one
 *   reminder (their total, dated from the earliest), and its next unpaid
 *   instalment once it is within `DEBT_DUE_SOON_DAYS`. The due date is
 *   ignored: the schedule is what the user follows.
 */
export function dueReminders(debt: Debt, payments: ReadonlyArray<DebtPayment>, todayISO: string): DebtReminder[] {
  const base = { debtId: debt.id, personName: debt.personName };

  if (!debt.schedule) {
    if (!debt.dueDate) return [];
    const days = daysBetween(todayISO, debt.dueDate);
    if (days < 0) return [{ ...base, amount: debt.outstanding, dueDate: debt.dueDate, kind: 'overdue' }];
    if (days <= DEBT_DUE_SOON_DAYS) return [{ ...base, amount: debt.outstanding, dueDate: debt.dueDate, kind: 'dueSoon' }];
    return [];
  }

  const unpaid = buildInstalments(debt, payments, todayISO).filter((i) => i.payment === null);
  const reminders: DebtReminder[] = [];
  const overdue = unpaid.filter((i) => i.status === 'overdue');
  if (overdue.length > 0) {
    reminders.push({
      ...base,
      amount: overdue.reduce((sum, i) => sum + i.amount, 0),
      dueDate: overdue[0].dueDate,
      kind: 'overdue',
      instalment: overdue[0].n,
      count: overdue.length,
    });
  }
  const next = unpaid.find((i) => i.status !== 'overdue');
  if (next && next.status === 'due') {
    reminders.push({ ...base, amount: next.amount, dueDate: next.dueDate, kind: 'dueSoon', instalment: next.n, count: 1 });
  }
  return reminders;
}
