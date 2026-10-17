import i18n from 'i18next';

import { getMonthCoverage } from '@/features/finance/expenses/expenses.coverage';
import { getAllCategories, getCategories } from '@/features/finance/expenses/expenses.service';
import { toISODate } from '@/utils/formatDate';
import { prevMonthISO } from '@/utils/monthMath';

import {
  getCarriedIn,
  getCategoryBudgets,
  getFixedSpendByCategory,
  getSpendByCategory,
  getTotalBudget,
} from './budget.envelopes';
import { getExpectedIncome, getSurplusSeen } from './budget.cashflow';
import { buildCategoryProgress, buildOverallProgress } from './budget.progress';
import { getMonthlyBudget } from './budget.service';
import type {
  BudgetOverview,
  CategoryBudgetCheck,
  CategoryBudgetProgress,
  MonthlyPlan,
  OverBudgetCheck,
} from './budget.types';

/**
 * Composition for the Budget tab and its planner (VS-33): turns the stored
 * envelopes in `budget.envelopes.ts` into the derived views the UI renders, and
 * hosts the per-category pre-save guard.
 */

/**
 * The month's distribution — how big the pot is and how much of it is already
 * handed out.
 *
 * Without an explicit total the pot is the month's **expected** income when an
 * estimate exists, so a salaried user can plan before payday and an irregular
 * receipt does not grow the budget (VS-47); otherwise income received, as
 * before. Income beyond the pot is `unbudgetedIncome`, for the user to give a
 * job. `derivedTotal` rides along so the planner can always offer it.
 *
 * @param receivedIncome Income logged in the month (`getMonthlyBudget().incomeTotal`).
 */
export async function buildMonthlyPlan(
  monthISO: string,
  receivedIncome: number,
): Promise<MonthlyPlan> {
  const [explicit, budgets, expectedIncome, surplusSeen] = await Promise.all([
    getTotalBudget(monthISO),
    getCategoryBudgets(monthISO),
    getExpectedIncome(monthISO),
    getSurplusSeen(monthISO),
  ]);

  const derivedTotal = expectedIncome ?? receivedIncome;
  const totalBudget = explicit ?? derivedTotal;
  const assigned = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
  const unbudgetedIncome = Math.max(0, receivedIncome - totalBudget);

  return {
    month: monthISO,
    totalBudget,
    isExplicit: explicit !== null,
    derivedTotal,
    derivedSource: expectedIncome === null ? 'received' : 'expected',
    expectedIncome,
    receivedIncome,
    unbudgetedIncome,
    surplusNeedsJob: unbudgetedIncome > surplusSeen,
    assigned,
    unassigned: totalBudget - assigned,
    isOverAllocated: assigned > totalBudget,
  };
}

/**
 * Every envelope's progress for `monthISO`, in category order.
 *
 * A category with no envelope is included **only when it has spending**, shown
 * with a zero budget. Unplanned spend is exactly what the user needs to see;
 * padding the list with every untouched category would bury it.
 */
export async function buildCategoryProgressList(
  monthISO: string,
  todayISO: string,
): Promise<CategoryBudgetProgress[]> {
  const [budgets, spendByCategory, fixedByCategory, carried, categories] = await Promise.all([
    getCategoryBudgets(monthISO),
    getSpendByCategory(monthISO),
    getFixedSpendByCategory(monthISO),
    getCarriedIn(monthISO),
    getAllCategories(),
  ]);

  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const rank = new Map(categories.map((c, index) => [c.id, index]));
  const budgeted = new Map(budgets.map((b) => [b.categoryId, b]));
  const ids = new Set<number>([...budgeted.keys(), ...spendByCategory.keys()]);

  return [...ids]
    .map((categoryId) => {
      const budget = budgeted.get(categoryId);
      return buildCategoryProgress(
        {
          categoryId,
          categoryName: nameOf.get(categoryId) ?? i18n.t('uncategorised', { ns: 'budget' }),
          allocated: budget?.allocatedAmount ?? 0,
          carriedIn: carried.get(categoryId) ?? 0,
          spent: spendByCategory.get(categoryId) ?? 0,
          fixedSpent: fixedByCategory.get(categoryId) ?? 0,
          rolloverEnabled: budget?.rolloverEnabled ?? false,
        },
        monthISO,
        todayISO,
      );
    })
    .sort(
      (a, b) =>
        (rank.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER),
    );
}

/**
 * The whole Budget tab in one read: plan, envelopes, and month-level pace.
 *
 * `available` folds rollover carry on top of the plan's total so the hero figure
 * agrees with what the envelopes actually add up to. `spent` counts **all** the
 * month's expenses, budgeted or not — a hero that ignored unbudgeted spending
 * would flatter the user precisely when they most need the truth.
 *
 * @param todayISO Injectable for tests and for viewing a past month.
 */
export async function getBudgetOverview(
  monthISO: string,
  todayISO: string = toISODate(new Date()),
): Promise<BudgetOverview> {
  const monthly = await getMonthlyBudget(monthISO);
  const [plan, categories, fixedByCategory] = await Promise.all([
    buildMonthlyPlan(monthISO, monthly.incomeTotal),
    buildCategoryProgressList(monthISO, todayISO),
    getFixedSpendByCategory(monthISO),
  ]);

  const totalCarried = categories.reduce((sum, c) => sum + c.carriedIn, 0);
  const available = plan.totalBudget + totalCarried;
  // Recurring bills are projected once, not at the daily pace (VS-40).
  const fixedSpent = [...fixedByCategory.values()].reduce((sum, v) => sum + v, 0);
  const overall = buildOverallProgress(
    available,
    monthly.expensesLogged,
    monthISO,
    todayISO,
    fixedSpent,
  );

  return {
    month: monthISO,
    plan,
    categories,
    totalCarried,
    available,
    ...overall,
    // A month sized by an income estimate already has a plan (VS-47).
    isUnplanned: !plan.isExplicit && plan.derivedSource === 'received' && plan.assigned === 0,
  };
}

/**
 * Average monthly spend per category over the `lookback` months *before*
 * `monthISO` — the "budget from what you actually spend" suggestion that
 * removes the blank-page problem on a first plan.
 *
 * Only **complete** months count (see `expenses.coverage`), and every complete
 * month counts — a month with no spend in a category contributes a real zero
 * (VS-41). Dividing by "months that had spend" instead turned one annual
 * 120,000 bill into a 120,000 suggestion every month, and a half-logged first
 * month made the user look frugal. An incomplete month is left out entirely
 * rather than guessed at.
 *
 * @returns Category id → suggested whole-FCFA amount. Empty until at least one
 *   month in the window is complete.
 */
export async function suggestFromHistory(
  monthISO: string,
  lookback: number = 3,
): Promise<Map<number, number>> {
  const months: string[] = [];
  let cursor = monthISO;
  for (let i = 0; i < lookback; i += 1) {
    cursor = prevMonthISO(cursor);
    months.push(cursor);
  }

  const coverage = await Promise.all(months.map(getMonthCoverage));
  const complete = coverage.filter((c) => c.isComplete).map((c) => c.month);
  if (complete.length === 0) return new Map();

  const perMonth = await Promise.all(complete.map(getSpendByCategory));

  const totals = new Map<number, number>();
  for (const spend of perMonth) {
    for (const [categoryId, amount] of spend) {
      totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount);
    }
  }

  const suggestions = new Map<number, number>();
  for (const [categoryId, sum] of totals) {
    if (sum > 0) suggestions.set(categoryId, Math.round(sum / complete.length));
  }
  return suggestions;
}

/** The visible top-level categories a month's envelopes can be assigned to. */
export async function getBudgetableCategories() {
  return getCategories();
}

/**
 * Decides whether logging `newExpenseAmount` this month would push total
 * expenses past the month's spending budget.
 *
 * The month lock that used to gate this is gone (VS-34) — nothing locks a month
 * any more. What replaces it is the budget itself: the guard stays silent while
 * the month has **no** budget to exceed (no explicit total and no income yet),
 * so expense logging is never interrupted before there is a figure to be over.
 * Lands-exactly-on-budget is not over (`>`, not `>=`).
 */
export async function checkOverBudget(
  monthISO: string,
  newExpenseAmount: number,
): Promise<OverBudgetCheck> {
  const budget = await getMonthlyBudget(monthISO);
  const plan = await buildMonthlyPlan(monthISO, budget.incomeTotal);
  const expenseBudget = plan.totalBudget;
  const remaining = expenseBudget - budget.expensesLogged;
  if (expenseBudget <= 0) {
    return { isOver: false, overage: 0, remaining, expenseBudget };
  }
  const after = budget.expensesLogged + newExpenseAmount;
  const isOver = after > expenseBudget;
  return { isOver, overage: isOver ? after - expenseBudget : 0, remaining, expenseBudget };
}

/**
 * Decides whether logging `amount` against `categoryId` would push that
 * envelope past its budget.
 *
 * Unlike the month-wide `checkOverBudget`, this is **not** gated on the
 * allocation lock: a category envelope is a number the user typed on purpose,
 * so it means something the moment it exists. A category with no envelope
 * reports `hasBudget: false` and never flags — there is nothing to exceed.
 *
 * Landing exactly on budget is not over (`>`, not `>=`), matching
 * `checkOverBudget`.
 */
export async function checkCategoryBudget(
  monthISO: string,
  categoryId: number,
  amount: number,
): Promise<CategoryBudgetCheck> {
  const [budgets, spendByCategory, carried, categories] = await Promise.all([
    getCategoryBudgets(monthISO),
    getSpendByCategory(monthISO),
    getCarriedIn(monthISO),
    getAllCategories(),
  ]);

  const budget = budgets.find((b) => b.categoryId === categoryId);
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? i18n.t('thisCategory', { ns: 'budget' });
  const spent = spendByCategory.get(categoryId) ?? 0;

  if (!budget) {
    return {
      isOver: false,
      overage: 0,
      remaining: 0,
      expenseBudget: 0,
      categoryId,
      categoryName,
      hasBudget: false,
    };
  }

  const available = budget.allocatedAmount + (carried.get(categoryId) ?? 0);
  const after = spent + amount;
  const isOver = after > available;

  return {
    isOver,
    overage: isOver ? after - available : 0,
    remaining: available - spent,
    expenseBudget: available,
    categoryId,
    categoryName,
    hasBudget: true,
  };
}
