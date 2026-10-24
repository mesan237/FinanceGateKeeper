import type {
  DayActivityStatus,
  UnplannedTotals,
} from '@/features/finance/expenses/expenses.types';

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
  /**
   * Whether the user has a plan for the month, by the Budget tab's own rule:
   * an explicit total, an expected-income estimate or envelopes. Income received
   * alone sizes `expenseBudget` but is not a plan, so Home shows what was spent
   * instead of a plan figure (UX-04).
   */
  isPlanned: boolean;
}

/** Month-to-date money in vs out. Income is the month's total; expenses the logged total. */
export interface Cashflow {
  income: number;
  expenses: number;
}

/** How much of the month so far is logged: days with an expense or a confirmed no-spend day. */
export interface DayLogging {
  loggedDays: number;
  /** Days of the month up to and including today. */
  daysSoFar: number;
}

export interface DashboardState {
  /** The month this snapshot covers, `YYYY-MM`. */
  monthISO: string;
  /** Whole days left in `monthISO` after today — the header's "6 days left". */
  daysRemaining: number;
  todaySpending: number;
  /** Per-day spending totals for the last 7 calendar days, oldest first
   * (the final entry is today). */
  spendingTrend: number[];
  zeroDay: DayActivityStatus;
  /** null before budget data is available */
  budget: BudgetSummary | null;
  /** Month-to-date income vs expenses. */
  cashflow: Cashflow | null;
  /** Logged days so far this month (UX-04). */
  logging: DayLogging;
  /** The month's imprévus — expenses the user marked as unplanned (VS-38). */
  unplanned: UnplannedTotals;
  /** The Budget tab's per-day figure: what is left in the plan over the days
   * left (UX-11). null when the month has no plan. */
  safeDailySpend: number | null;
}
