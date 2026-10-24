import { getBudgetOverview } from '@/features/finance/budget/budget.plan';
import type { BudgetHealth } from '@/features/finance/budget/budget.types';
import { getLoggedDates } from '@/features/finance/expenses/expenses.coverage';
import * as expensesService from '@/features/finance/expenses/expenses.service';
import { getUnplannedTotals } from '@/features/finance/expenses/expenses.unplanned';
import { isoDaysBefore, toISODate } from '@/utils/formatDate';
import { daysInMonth, daysRemainingInMonth, lastDayOfMonth } from '@/utils/monthMath';

import type {
  BudgetSummary,
  Cashflow,
  DashboardState,
  DayLogging,
  PaceLevel,
} from './dashboard.types';

/** Dashboard colour for each budget health verdict. */
const PACE_BY_HEALTH: Record<BudgetHealth, PaceLevel> = {
  on_track: 'green',
  at_risk: 'yellow',
  over: 'red',
};

/**
 * Maps the Budget tab's health verdict onto the dashboard's pace colour (VS-40).
 * The dashboard used to run its own 75% threshold, so the same month could read
 * "at risk" on Budget and green here; now both screens share one rule. Pure.
 */
export function paceFromHealth(health: BudgetHealth): PaceLevel {
  return PACE_BY_HEALTH[health];
}

/** Number of calendar days covered by the dashboard's spending sparkline. */
const TREND_DAYS = 7;

/**
 * Buckets expenses into per-day totals for the `days` calendar days ending at
 * `todayISO`, oldest first — feeds the dashboard's spending sparkline. Days
 * with no expenses are zero; expenses outside the window are ignored. Pure.
 */
export function buildSpendingTrend(
  expenses: ReadonlyArray<{ date: string; amount: number }>,
  todayISO: string,
  days: number = TREND_DAYS,
): number[] {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.date, (totals.get(e.date) ?? 0) + e.amount);
  return Array.from(
    { length: days },
    (_, i) => totals.get(isoDaysBefore(todayISO, days - 1 - i)) ?? 0,
  );
}

// Calendar arithmetic lives in `@/utils/monthMath` so the budget slice can share
// it (features may not import each other's services outside the approved list).
// Re-exported here because the dashboard's own tests and callers address these
// through `dashboard.service`.
export { daysInMonth, daysRemainingInMonth } from '@/utils/monthMath';

/**
 * Share of the expense budget already spent, as a whole percentage clamped to
 * 0–100. Returns 0 when there is no budget (avoids divide-by-zero). Pure.
 */
export function spentPct(expensesLogged: number, expenseBudget: number): number {
  if (expenseBudget <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((expensesLogged / expenseBudget) * 100)));
}

/**
 * The recommended even daily spend: the month's expense budget spread across
 * every calendar day of the month. Returns 0 when no budget is set. Pure.
 */
export function dailyBudgetPace(expenseBudget: number, monthISO: string): number {
  const days = daysInMonth(monthISO);
  if (days <= 0 || expenseBudget <= 0) return 0;
  return expenseBudget / days;
}

/**
 * Days of `monthISO` up to and including `todayISO`: the day of the month while
 * it runs, every day once it is over, none before it starts. Pure.
 */
export function daysSoFarInMonth(monthISO: string, todayISO: string): number {
  if (todayISO < `${monthISO}-01`) return 0;
  if (!todayISO.startsWith(monthISO)) return daysInMonth(monthISO);
  return Number(todayISO.slice(8, 10));
}

/**
 * Aggregates the dashboard state for `monthISO` — today's spending, zero-day
 * status, the budget and cashflow figures, the days logged so far, and the
 * month's imprévus.
 *
 * Budget data used to be conditional on control mode; with learning mode gone
 * (VS-34) it always loads. Whether the month has a plan follows the Budget
 * tab's rule (UX-04).
 *
 * @param todayISO Defaults to today (UTC). Explicit for testability.
 */
export async function getDashboardSnapshot(
  monthISO: string,
  todayISO: string = toISODate(new Date()),
): Promise<DashboardState> {
  // One range query covers both the 7-day trend and today's total (its last bucket).
  const monthStart = `${monthISO}-01`;
  const [recentExpenses, zeroDay, unplanned, loggedDates] = await Promise.all([
    expensesService.getExpensesByDateRange(isoDaysBefore(todayISO, TREND_DAYS - 1), todayISO),
    expensesService.getDayActivityStatus(todayISO),
    getUnplannedTotals(monthStart, lastDayOfMonth(monthISO)),
    // Same "logged day" as complete months and the journey use (VS-41).
    getLoggedDates(monthStart, todayISO),
  ]);

  const spendingTrend = buildSpendingTrend(recentExpenses, todayISO);
  const todaySpending = spendingTrend[spendingTrend.length - 1];

  // The Budget tab's own overview, so the dashboard summary can never disagree
  // with the tab it summarises: the same total (explicit, else expected or
  // received income), the same rollover carry, and the same health verdict (VS-40).
  const overview = await getBudgetOverview(monthISO, todayISO);
  const expenseBudget = overview.available;
  // Income in is what was received; expected income only sizes the plan (VS-47).
  const incomeTotal = overview.plan.receivedIncome;

  const daysRemaining = daysRemainingInMonth(monthISO, todayISO);

  const budget: BudgetSummary = {
    expenseBudget,
    expensesLogged: overview.spent,
    expensesRemaining: overview.remaining,
    spentPct: spentPct(overview.spent, expenseBudget),
    pace: paceFromHealth(overview.health),
    // The Budget tab's own rule, so Home and Budget agree on whether a plan exists.
    isPlanned: !overview.isUnplanned,
  };

  const cashflow: Cashflow = {
    income: incomeTotal,
    expenses: overview.spent,
  };

  const logging: DayLogging = {
    loggedDays: loggedDates.size,
    daysSoFar: daysSoFarInMonth(monthISO, todayISO),
  };

  // Without a plan there is no pace to keep: income alone is not a budget (UX-04).
  const dailyPace = budget.isPlanned ? dailyBudgetPace(expenseBudget, monthISO) : null;

  return {
    monthISO,
    daysRemaining,
    todaySpending,
    spendingTrend,
    zeroDay,
    budget,
    cashflow,
    logging,
    unplanned,
    dailyPace,
  };
}
