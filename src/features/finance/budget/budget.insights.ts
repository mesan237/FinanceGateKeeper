import { getExpensesByDateRange } from '@/features/finance/expenses/expenses.service';
import { toISODate } from '@/utils/formatDate';
import { daysInMonth, firstDayOfMonth, lastDayOfMonth, weeksInMonth } from '@/utils/monthMath';

import { buildBurndown, buildWeeklyTrend } from './budget.trend';

/**
 * The Budget tab's analytics (VS-33): the burn-down and weekly pace.
 *
 * Every figure here has to answer a question the user can act on. Anything that
 * would only restate what the envelope rows already say is deliberately absent:
 * Reports owns the donut and the month-over-month comparison, the Dashboard owns
 * the sparkline, and a category's own change shows in its detail (VS-56). The
 * budget-share ranking and month-over-month rows that used to live here went in
 * VS-56 for repeating them.
 */

export interface BudgetTrend {
  /** Spend per 7-day bucket, oldest first. */
  weekly: number[];
  /** What one week's even-pace spend would be. */
  weeklyPace: number;
  burndown: { day: number; ideal: number; actual: number }[];
}

/**
 * Weekly spend buckets and the ideal-vs-actual burn-down for `monthISO`.
 *
 * @param available The month's total spendable budget (plan total + carry).
 * @param todayISO Injectable for tests and for viewing a past month.
 */
export async function getBudgetTrend(
  monthISO: string,
  available: number,
  todayISO: string = toISODate(new Date()),
): Promise<BudgetTrend> {
  const expenses = await getExpensesByDateRange(
    firstDayOfMonth(monthISO),
    lastDayOfMonth(monthISO),
  );

  const weeks = weeksInMonth(monthISO);
  return {
    weekly: buildWeeklyTrend(expenses, monthISO),
    weeklyPace: weeks > 0 ? (available / daysInMonth(monthISO)) * 7 : 0,
    burndown: buildBurndown(expenses, available, monthISO, todayISO),
  };
}
