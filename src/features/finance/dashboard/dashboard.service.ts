import * as budgetService from '@/features/finance/budget/budget.service';
import * as expensesService from '@/features/finance/expenses/expenses.service';
import * as fundsService from '@/features/finance/funds/funds.service';
import * as projectsService from '@/features/finance/projects/projects.service';
import { toISODate } from '@/utils/formatDate';

import type {
  BudgetSummary,
  DashboardState,
  FundsSummary,
  PaceLevel,
  TopProject,
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

/**
 * Returns the number of whole days remaining in `monthISO` after `todayISO`,
 * inclusive of `todayISO` being the current day (so the last day of the month
 * gives 0, not 1). Returns 0 if `todayISO` is not in `monthISO`. Pure.
 */
export function daysRemainingInMonth(monthISO: string, todayISO: string): number {
  const [y, m] = monthISO.split('-').map(Number);
  // Date.UTC(y, m, 0) — day 0 of month `m` (0-indexed) = last day of month `m-1` (0-indexed)
  //   = last day of month `m` (1-indexed, as stored in monthISO). So this gives the last
  //   calendar day of the month in `monthISO`.
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const todayDate = new Date(`${todayISO}T00:00:00Z`);
  const todayMonthISO = `${todayDate.getUTCFullYear()}-${String(todayDate.getUTCMonth() + 1).padStart(2, '0')}`;
  if (todayMonthISO !== monthISO) return 0;
  return Math.max(0, lastDay - todayDate.getUTCDate());
}

/**
 * Aggregates the dashboard state for `monthISO`. Always loads today's spending
 * and zero-day status. Loads budget, funds, and project data only when
 * `includeBudgetData` is true (control mode); in learning mode those three
 * fields are `null`.
 *
 * @param todayISO Defaults to today (UTC). Explicit for testability.
 */
export async function getDashboardSnapshot(
  monthISO: string,
  opts: { includeBudgetData: boolean },
  todayISO: string = toISODate(new Date()),
): Promise<DashboardState> {
  const [todayExpenses, zeroDay] = await Promise.all([
    expensesService.getExpensesByDateRange(todayISO, todayISO),
    expensesService.getDayActivityStatus(todayISO),
  ]);

  const todaySpending = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (!opts.includeBudgetData) {
    return { todaySpending, zeroDay, budget: null, funds: null, topProject: null };
  }

  const [monthlyBudget, allFunds, projects] = await Promise.all([
    budgetService.getMonthlyBudget(monthISO),
    fundsService.getOrCreateFunds(),
    projectsService.getProjects(),
  ]);

  const daysRemaining = daysRemainingInMonth(monthISO, todayISO);

  const budget: BudgetSummary = {
    expenseBudget: monthlyBudget.breakdown.expenses,
    expensesRemaining: monthlyBudget.expensesRemaining,
    pace: paceIndicator(
      monthlyBudget.expensesLogged,
      monthlyBudget.breakdown.expenses,
      daysRemaining,
    ),
  };

  const fundProgressList = allFunds.map(fundsService.getFundProgress);
  const emergencyProgress = fundProgressList.find((f) => f.type === 'emergency');
  const savingsProgress = fundProgressList.find((f) => f.type === 'savings');
  if (!emergencyProgress || !savingsProgress) {
    throw new Error('Expected both fund types to exist after getOrCreateFunds');
  }
  const funds: FundsSummary = { emergency: emergencyProgress, savings: savingsProgress };

  const activeProject = projects.find((p) => p.status === 'active');
  const topProject: TopProject | null = activeProject
    ? {
        project: activeProject,
        pct: Math.round((activeProject.fundedAmount / activeProject.targetAmount) * 100),
      }
    : null;

  return { todaySpending, zeroDay, budget, funds, topProject };
}
