import type { DayActivityStatus } from '@/features/finance/expenses/expenses.types';

export type PaceLevel = 'green' | 'yellow' | 'red';

export interface BudgetSummary {
  /** The month's spending budget — explicit total when set, else the income. */
  expenseBudget: number;
  /** Total expenses logged this month (the spent side of the budget). */
  expensesLogged: number;
  expensesRemaining: number;
  /** Share of the expense budget already spent, 0–100 (clamped). */
  spentPct: number;
  pace: PaceLevel;
}

/** Month-to-date money in vs out. Income is the month's total; expenses the logged total. */
export interface Cashflow {
  income: number;
  expenses: number;
  /** income − expenses; negative when the month is running at a deficit. */
  net: number;
}

export interface DashboardState {
  todaySpending: number;
  /** Per-day spending totals for the last 7 calendar days, oldest first
   * (the final entry is today). */
  spendingTrend: number[];
  zeroDay: DayActivityStatus;
  /** null before budget data is available */
  budget: BudgetSummary | null;
  /** Month-to-date income vs expenses. */
  cashflow: Cashflow | null;
  /** Recommended daily expense spend (expense budget ÷ days in month). null
   * when no expense budget is set. */
  dailyPace: number | null;
}
