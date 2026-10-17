import { advanceDueDate } from '@/features/finance/expenses/expenses.service';
import type { Frequency } from '@/features/finance/expenses/expenses.types';
import { query } from '@/services/database';
import { lastDayOfMonth } from '@/utils/monthMath';

import type { CommittedMoney } from './budget.types';

/**
 * Committed money (VS-47): what is already spoken for before `monthISO` ends.
 *
 * Shown beside the budget and the cash, never subtracted from either — the
 * budget is a plan and the cash is a fact, and committed money is neither. It
 * answers "how much of my cash is already promised?".
 *
 * Planned items and debts are read by SQL, the way wallet balances read them,
 * so the budget slice gains no dependency on `planned` or `debt`. Planned
 * items still never touch the budget: this is a display figure only.
 */

/**
 * Every recurring occurrence still to be logged up to the month's last day.
 * Starts at each bill's `next_due_date`, which the auto-logger moves past
 * whatever it has already logged, so nothing is counted twice. A due date the
 * logger has not reached yet (the app was closed) still counts — it will be
 * logged, and paid.
 */
async function recurringDue(lastDay: string): Promise<number> {
  const bills = await query<{ amount: number; frequency: Frequency; next_due_date: string }>(
    `SELECT amount, frequency, next_due_date FROM recurring_expenses
     WHERE is_active = 1 AND next_due_date <= ?`,
    [lastDay],
  );
  let total = 0;
  for (const bill of bills) {
    for (let due = bill.next_due_date; due <= lastDay; due = advanceDueDate(due, bill.frequency)) {
      total += bill.amount;
    }
  }
  return total;
}

/**
 * Open planned purchases due by the month's last day — by the item's own date,
 * else its list's (VS-39). Undated items are not yet promised to any month.
 */
async function plannedDue(lastDay: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(i.estimated_amount), 0) AS total
     FROM planned_items i JOIN planned_lists l ON l.id = i.list_id
     WHERE i.expense_id IS NULL AND COALESCE(i.planned_date, l.due_date) <= ?`,
    [lastDay],
  );
  return row.total;
}

/** What is still owed on the user's pending debts due by the month's last day, less repayments. */
async function debtsDue(lastDay: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(MAX(d.amount - (
        SELECT COALESCE(SUM(p.amount), 0) FROM debt_payments p
        WHERE p.debt_id = d.id AND p.deleted_at IS NULL), 0)), 0) AS total
     FROM debts d
     WHERE d.deleted_at IS NULL AND d.direction = 'owed' AND d.status = 'pending'
       AND d.due_date IS NOT NULL AND d.due_date <= ?`,
    [lastDay],
  );
  return row.total;
}

/**
 * Committed money for `monthISO`: recurring bills still to log, open planned
 * purchases and debts owed, each due by the end of the month. Overdue items
 * are included — they are still owed.
 */
export async function getCommitted(monthISO: string): Promise<CommittedMoney> {
  const lastDay = lastDayOfMonth(monthISO);
  const [recurring, planned, debts] = await Promise.all([
    recurringDue(lastDay),
    plannedDue(lastDay),
    debtsDue(lastDay),
  ]);
  return { recurring, planned, debts, total: recurring + planned + debts };
}
