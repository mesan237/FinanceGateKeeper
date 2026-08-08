import { getAllCategories, getCategories } from '@/features/finance/expenses/expenses.service';
import { toISODate } from '@/utils/formatDate';
import { prevMonthISO } from '@/utils/monthMath';

import {
  getCarriedIn,
  getCategoryBudgets,
  getSpendByCategory,
  getTotalBudget,
} from './budget.envelopes';
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
 * `derivedTotal` is always carried alongside `totalBudget` so the planner can
 * offer the income-split figure as a one-tap suggestion even when the user has
 * set an explicit total.
 */
export async function buildMonthlyPlan(
  monthISO: string,
  derivedTotal: number,
): Promise<MonthlyPlan> {
  const [explicit, budgets] = await Promise.all([
    getTotalBudget(monthISO),
    getCategoryBudgets(monthISO),
  ]);

  const totalBudget = explicit ?? derivedTotal;
  const assigned = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);

  return {
    month: monthISO,
    totalBudget,
    isExplicit: explicit !== null,
    derivedTotal,
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
  const [budgets, spendByCategory, carried, categories] = await Promise.all([
    getCategoryBudgets(monthISO),
    getSpendByCategory(monthISO),
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
          categoryName: nameOf.get(categoryId) ?? 'Uncategorised',
          allocated: budget?.allocatedAmount ?? 0,
          carriedIn: carried.get(categoryId) ?? 0,
          spent: spendByCategory.get(categoryId) ?? 0,
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
  const [plan, categories] = await Promise.all([
    buildMonthlyPlan(monthISO, monthly.breakdown.expenses),
    buildCategoryProgressList(monthISO, todayISO),
  ]);

  const totalCarried = categories.reduce((sum, c) => sum + c.carriedIn, 0);
  const available = plan.totalBudget + totalCarried;
  const overall = buildOverallProgress(available, monthly.expensesLogged, monthISO, todayISO);

  return {
    month: monthISO,
    plan,
    categories,
    totalCarried,
    available,
    ...overall,
    isUnplanned: !plan.isExplicit && plan.assigned === 0,
  };
}

/**
 * Average monthly spend per category over the `lookback` months *before*
 * `monthISO` — the "budget from what you actually spend" suggestion that
 * removes the blank-page problem on a first plan.
 *
 * The average divides by the number of months that actually had spending, not
 * by `lookback`. Dividing by the full window would halve the suggestion for
 * someone one month into using the app, and a suggestion that is reliably too
 * low teaches the user to ignore suggestions.
 *
 * @returns Category id → suggested whole-FCFA amount. Empty with no history.
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

  const perMonth = await Promise.all(months.map(getSpendByCategory));

  const totals = new Map<number, { sum: number; months: number }>();
  for (const spend of perMonth) {
    for (const [categoryId, amount] of spend) {
      if (amount <= 0) continue;
      const entry = totals.get(categoryId) ?? { sum: 0, months: 0 };
      entry.sum += amount;
      entry.months += 1;
      totals.set(categoryId, entry);
    }
  }

  const suggestions = new Map<number, number>();
  for (const [categoryId, { sum, months: n }] of totals) {
    suggestions.set(categoryId, Math.round(sum / n));
  }
  return suggestions;
}

/** The visible top-level categories a month's envelopes can be assigned to. */
export async function getBudgetableCategories() {
  return getCategories();
}

/**
 * Decides whether logging `newExpenseAmount` this month would push total
 * expenses past the month's confirmed expense allocation.
 *
 * The guard is only active once the allocation is **locked** (the user has
 * confirmed it on the allocation screen). Until then — learning mode, or a
 * control-mode month not yet set up — the auto-materialised default allocation
 * stays unlocked and this always reports "not over", so expense logging is
 * never interrupted before a budget exists. Lands-exactly-on-budget is not over
 * (`>`, not `>=`).
 */
export async function checkOverBudget(
  monthISO: string,
  newExpenseAmount: number,
): Promise<OverBudgetCheck> {
  const budget = await getMonthlyBudget(monthISO);
  const expenseBudget = budget.breakdown.expenses;
  const remaining = budget.expensesRemaining;
  if (!budget.allocation.isLocked) {
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
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? 'this category';
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
