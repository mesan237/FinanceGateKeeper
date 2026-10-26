import { advanceDueDate } from '@/features/finance/expenses/expenses.service';
import type { Frequency } from '@/features/finance/expenses/expenses.types';
import { getDueContributions } from '@/features/finance/tontines/tontines.due';
import { query } from '@/services/database';
import { cycleDate, type CycleFrequency } from '@/utils/cycleDate';
import { instalmentAmounts } from '@/utils/instalments';
import { lastDayOfMonth } from '@/utils/monthMath';

import type { CommittedMoney, DueItem, DueKind } from './budget.types';

/**
 * Committed money (VS-47): what is already spoken for before `monthISO` ends.
 *
 * Shown beside the budget and the cash, never subtracted from either — the
 * budget is a plan and the cash is a fact, and committed money is neither. It
 * answers "how much of my cash is already promised?".
 *
 * Every source lists its payments one by one (`DueItem`, for Home's "Next for
 * you"), and the totals are their sums, so Home's list and the Budget tab's
 * figure can never disagree.
 *
 * Planned items and debts are read by SQL, the way wallet balances read them,
 * so the budget slice gains no dependency on `planned` or `debt`. Planned
 * items still never touch the budget: this is a display figure only.
 *
 * Tontine contributions (VS-52) come from `tontines.getDueContributions`
 * through the approved `budget → tontines` edge: their dates follow from a
 * derived schedule, which SQL alone cannot reproduce.
 */

/**
 * Every recurring occurrence still to be logged up to the month's last day.
 * Starts at each bill's `next_due_date`, which the auto-logger moves past
 * whatever it has already logged, so nothing is counted twice. A due date the
 * logger has not reached yet (the app was closed) still counts — it will be
 * logged, and paid.
 */
async function recurringItems(lastDay: string): Promise<DueItem[]> {
  const bills = await query<{ label: string; amount: number; frequency: Frequency; next_due_date: string }>(
    `SELECT label, amount, frequency, next_due_date FROM recurring_expenses
     WHERE is_active = 1 AND next_due_date <= ?`,
    [lastDay],
  );
  const items: DueItem[] = [];
  for (const bill of bills) {
    for (let due = bill.next_due_date; due <= lastDay; due = advanceDueDate(due, bill.frequency)) {
      items.push({ kind: 'recurring', label: bill.label, amount: bill.amount, date: due });
    }
  }
  return items;
}

/**
 * Open planned purchases due by the month's last day — by the item's own date,
 * else its list's (VS-39). Undated items are not yet promised to any month.
 */
async function plannedItems(lastDay: string): Promise<DueItem[]> {
  const rows = await query<{ name: string; amount: number; due: string }>(
    `SELECT i.name, i.estimated_amount AS amount, COALESCE(i.planned_date, l.due_date) AS due
     FROM planned_items i JOIN planned_lists l ON l.id = i.list_id
     WHERE i.expense_id IS NULL AND COALESCE(i.planned_date, l.due_date) <= ?`,
    [lastDay],
  );
  return rows.map((r) => ({ kind: 'planned', label: r.name, amount: r.amount, date: r.due }));
}

/**
 * What the user's pending debts ask for by the month's last day, overdue
 * included. An unscheduled debt counts once its due date falls by then: its
 * total to repay (interest included, VS-54), else its amount, less repayments.
 * A scheduled debt counts only its unpaid instalments dated by then — never the
 * whole balance (user decision, VS-54).
 */
async function debtItems(lastDay: string): Promise<DueItem[]> {
  const unscheduled = await query<{ person: string; remaining: number; due: string }>(
    `SELECT d.person_name AS person, d.due_date AS due, COALESCE(d.total_to_repay, d.amount) - (
        SELECT COALESCE(SUM(p.amount), 0) FROM debt_payments p
        WHERE p.debt_id = d.id AND p.deleted_at IS NULL) AS remaining
     FROM debts d
     WHERE d.deleted_at IS NULL AND d.direction = 'owed' AND d.status = 'pending'
       AND d.instalment_count IS NULL AND d.due_date IS NOT NULL AND d.due_date <= ?`,
    [lastDay],
  );
  const items: DueItem[] = unscheduled
    .filter((d) => d.remaining > 0)
    .map((d) => ({ kind: 'debt', label: d.person, amount: d.remaining, date: d.due }));

  const scheduled = await query<{
    id: number;
    person: string;
    repayable: number;
    count: number;
    frequency: CycleFrequency;
    first_date: string;
  }>(
    `SELECT id, person_name AS person, COALESCE(total_to_repay, amount) AS repayable, instalment_count AS count,
       instalment_frequency AS frequency, first_instalment_date AS first_date
     FROM debts
     WHERE deleted_at IS NULL AND direction = 'owed' AND status = 'pending' AND instalment_count IS NOT NULL`,
  );
  for (const debt of scheduled) {
    const paid = new Set(
      (
        await query<{ instalment: number }>(
          'SELECT instalment FROM debt_payments WHERE debt_id = ? AND instalment IS NOT NULL AND deleted_at IS NULL',
          [debt.id],
        )
      ).map((r) => r.instalment),
    );
    instalmentAmounts(debt.repayable, debt.count).forEach((amount, i) => {
      const n = i + 1;
      const date = cycleDate(debt.first_date, debt.frequency, n);
      if (!paid.has(n) && date <= lastDay) items.push({ kind: 'debt', label: debt.person, amount, date });
    });
  }
  return items;
}

/** Unpaid tontine contributions due by the month's last day, overdue included. */
async function tontineItems(lastDay: string): Promise<DueItem[]> {
  const due = await getDueContributions(lastDay);
  return due.map((c) => ({ kind: 'tontine', label: c.tontineName, amount: c.amount, date: c.dueDate }));
}

/** The order items of the same day are listed in. */
const KIND_ORDER: readonly DueKind[] = ['debt', 'tontine', 'recurring', 'planned'];

/**
 * Every payment due by the end of `monthISO`, one line each — recurring bills
 * still to log, open planned purchases, debts owed (each unpaid instalment) and
 * tontine contributions — oldest date first, so anything overdue leads. Home's
 * "Next for you" lists them; their sum is the committed total.
 */
export async function getDueItems(monthISO: string): Promise<DueItem[]> {
  const lastDay = lastDayOfMonth(monthISO);
  const groups = await Promise.all([
    recurringItems(lastDay),
    plannedItems(lastDay),
    debtItems(lastDay),
    tontineItems(lastDay),
  ]);
  return groups
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/**
 * Committed money for `monthISO`: recurring bills still to log, open planned
 * purchases, debts owed and tontine contributions, each due by the end of the
 * month. Overdue items are included — they are still owed.
 */
export async function getCommitted(monthISO: string): Promise<CommittedMoney> {
  const items = await getDueItems(monthISO);
  const sum = (kind: DueKind) => items.filter((i) => i.kind === kind).reduce((s, i) => s + i.amount, 0);
  const recurring = sum('recurring');
  const planned = sum('planned');
  const debts = sum('debt');
  const tontines = sum('tontine');
  return { recurring, planned, debts, tontines, total: recurring + planned + debts + tontines };
}
