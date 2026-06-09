import type { DayActivityStatus } from '@/features/finance/expenses/expenses.types';
import type { FundProgress } from '@/features/finance/funds/funds.types';
import type { Project } from '@/features/finance/projects/projects.types';

export type PaceLevel = 'green' | 'yellow' | 'red';

export interface BudgetSummary {
  expenseBudget: number;
  expensesRemaining: number;
  pace: PaceLevel;
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
  zeroDay: DayActivityStatus;
  /** null in learning mode or before budget data is available */
  budget: BudgetSummary | null;
  /** null in learning mode */
  funds: FundsSummary | null;
  /** null in learning mode or when no active projects exist */
  topProject: TopProject | null;
}
