import { buildMonthlyPlan } from '@/features/finance/budget/budget.plan';
import * as budgetService from '@/features/finance/budget/budget.service';
import * as expensesService from '@/features/finance/expenses/expenses.service';
import { toISODate } from '@/utils/formatDate';
import { daysInMonth, daysRemainingInMonth } from '@/utils/monthMath';

import type {
  BudgetSummary,
  Cashflow,
  DashboardState,
  PaceLevel,
} from './dashboard.types';

/**
 * Derives a budget-pace colour from how much of the expense allocation has
 * been spent and how many days remain in the month. Pure — no DB access.
 *
 * - `red`    — spent strictly exceeds the budget.
 * - `yellow` — spent is 75–99% of the budget with days still remaining
 *              (a warning that the budget is nearly exhausted before month end).
 * - `green`  — everything else (on track, exactly at budget, or no budget set).
 */
export function paceIndicator(spent: number, budget: number, daysRemaining: number): PaceLevel {
  if (spent > budget) return 'red';
  if (budget > 0 && spent < budget && spent / budget >= 0.75 && daysRemaining > 0) return 'yellow';
  return 'green';
}

/** Number of calendar days covered by the dashboard's spending sparkline. */
const TREND_DAYS = 7;

/** Returns the ISO date `days` calendar days before `iso` (UTC math — no DST drift). */
function isoDaysBefore(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}-${day}`;
}

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
 * Aggregates the dashboard state for `monthISO` — today's spending, zero-day
 * status, and the budget, fund, and project figures.
 *
 * Budget data used to be conditional on control mode; with learning mode gone
 * (VS-34) it always loads.
 *
 * @param todayISO Defaults to today (UTC). Explicit for testability.
 */
export async function getDashboardSnapshot(
  monthISO: string,
  todayISO: string = toISODate(new Date()),
): Promise<DashboardState> {
  // One range query covers both the 7-day trend and today's total (its last bucket).
  const [recentExpenses, zeroDay] = await Promise.all([
    expensesService.getExpensesByDateRange(isoDaysBefore(todayISO, TREND_DAYS - 1), todayISO),
    expensesService.getDayActivityStatus(todayISO),
  ]);

  const spendingTrend = buildSpendingTrend(recentExpenses, todayISO);
  const todaySpending = spendingTrend[spendingTrend.length - 1];

  const monthlyBudget = await budgetService.getMonthlyBudget(monthISO);
  // The same resolution the Budget tab uses — an explicit total when the user
  // set one, the month's income otherwise. Reading `incomeTotal` directly here
  // would make the dashboard hero disagree with the tab it summarises.
  const plan = await buildMonthlyPlan(monthISO, monthlyBudget.incomeTotal);
  const expenseBudget = plan.totalBudget;

  const daysRemaining = daysRemainingInMonth(monthISO, todayISO);

  const budget: BudgetSummary = {
    expenseBudget,
    expensesLogged: monthlyBudget.expensesLogged,
    expensesRemaining: expenseBudget - monthlyBudget.expensesLogged,
    spentPct: spentPct(monthlyBudget.expensesLogged, expenseBudget),
    pace: paceIndicator(monthlyBudget.expensesLogged, expenseBudget, daysRemaining),
  };

  const cashflow: Cashflow = {
    income: monthlyBudget.incomeTotal,
    expenses: monthlyBudget.expensesLogged,
    net: monthlyBudget.incomeTotal - monthlyBudget.expensesLogged,
  };

  const dailyPace = dailyBudgetPace(expenseBudget, monthISO);

  return { todaySpending, spendingTrend, zeroDay, budget, cashflow, dailyPace };
}
