import { execute, query } from '@/services/database';
import { nextMonthISO } from '@/utils/monthMath';

import { setTotalBudget } from './budget.envelopes';
import { ensureMonthRow } from './budget.service';
import type { MonthlyPlan } from './budget.types';

/**
 * Budgeting with real cash flow (VS-47): expected income kept apart from
 * income received, and income beyond the plan given a job by the user rather
 * than raising the budget on its own.
 *
 * Expected income is never cash. It only sizes the plan; wallet balances and
 * every report of what came in still read income received.
 */

/**
 * The typical-income estimate (VS-46) in force for `monthISO`: the latest one
 * recorded before the month ended.
 *
 * Reading "before the month ended" rather than "the latest" keeps history
 * stable — a month that closed before the user gave an estimate keeps the
 * budget it had, and a later change of estimate does not rewrite past months.
 *
 * @returns Whole FCFA, or null when no positive estimate applies.
 */
export async function getExpectedIncome(monthISO: string): Promise<number | null> {
  const rows = await query<{ value: number }>(
    `SELECT value FROM baseline_facts
     WHERE kind = 'monthly_income' AND created_at < ?
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [`${nextMonthISO(monthISO)}-01`],
  );
  const value = rows[0]?.value ?? 0;
  return value > 0 ? value : null;
}

/** How much income above the budget the user already chose to leave unbudgeted this month. */
export async function getSurplusSeen(monthISO: string): Promise<number> {
  const rows = await query<{ surplus_seen: number | null }>(
    'SELECT surplus_seen FROM allocations WHERE month = ?',
    [monthISO],
  );
  return rows[0]?.surplus_seen ?? 0;
}

/**
 * Records that the user saw `amount` of unbudgeted income and chose to leave
 * it unassigned. The prompt stays quiet until more income than this arrives.
 */
export async function leaveSurplusUnbudgeted(monthISO: string, amount: number): Promise<void> {
  await ensureMonthRow(monthISO);
  await execute('UPDATE allocations SET surplus_seen = ? WHERE month = ?', [amount, monthISO]);
}

/**
 * Gives the month's unbudgeted income a job by adding it to the budget. The
 * total becomes explicit, so a later change of estimate leaves this month as
 * the user set it.
 */
export async function addSurplusToBudget(plan: MonthlyPlan): Promise<void> {
  await ensureMonthRow(plan.month);
  await setTotalBudget(plan.month, plan.totalBudget + plan.unbudgetedIncome);
}
