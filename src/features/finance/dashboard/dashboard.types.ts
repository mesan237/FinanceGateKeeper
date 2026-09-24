import type { DayActivityStatus } from '@/features/finance/expenses/expenses.types';
import type { FundProgress } from '@/features/finance/funds/funds.types';
import type { Project } from '@/features/finance/projects/projects.types';

export type PaceLevel = 'green' | 'yellow' | 'red';

export interface BudgetSummary {
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

export interface FundsSummary {
  emergency: FundProgress;
  savings: FundProgress;
}

export interface TopProject {
  project: Project;
  pct: number;
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
  funds: FundsSummary | null;
  /** null when no active projects exist */
  topProject: TopProject | null;
}
