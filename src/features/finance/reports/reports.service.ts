import {
  getExpensesByDateRange,
  getAllCategories,
} from '@/features/finance/expenses/expenses.service';
import { getIncomeByDateRange } from '@/features/finance/income/income.service';
import { buildMonthlyPlan } from '@/features/finance/budget/budget.plan';
import { getMonthlyBudget } from '@/features/finance/budget/budget.service';
import { getOutstandingTotals } from '@/features/finance/debt/debt.service';
import type { Expense, Category } from '@/features/finance/expenses/expenses.types';
import { toISODate } from '@/utils/formatDate';
import { lastDayOfMonth, prevMonthISO } from '@/utils/monthMath';

import type {
  CategorySpend,
  CategoryDelta,
  DaySpend,
  MonthComparison,
  MonthlyReport,
  OptimizationSuggestion,
  WeeklyReport,
} from './reports.types';

/** Sums a list of expense amounts. */
function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

/** Builds a category-id → display-label resolver from the category list. */
function categoryLabelResolver(categories: Category[]): (id: number) => string {
  const byId = new Map(categories.map((c) => [c.id, c.name]));
  return (id) => byId.get(id) ?? 'Uncategorised';
}

/** Groups expenses by category id, summing amounts. */
function sumByCategory(expenses: Expense[]): Map<number, number> {
  const byCat = new Map<number, number>();
  for (const e of expenses) {
    byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
  }
  return byCat;
}

/**
 * Turns category totals into ranked `CategorySpend[]` (desc by amount). `limit`
 * caps the number of entries; pct is each category's share of `total`.
 */
function rankedCategories(
  expenses: Expense[],
  labelOf: (id: number) => string,
  total: number,
  limit: number,
): CategorySpend[] {
  return [...sumByCategory(expenses).entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      categoryLabel: labelOf(categoryId),
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/** Advances a `YYYY-MM-DD` date by `days` (UTC-stable). */
function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/**
 * Share of the expense budget already spent, as a whole percentage clamped to
 * 0–100. Returns 0 when nothing is planned (avoids divide-by-zero). Drives the
 * Expense Performance bar's spent-over-remaining fill. Pure.
 */
export function expenseSpentPct(actual: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((actual / planned) * 100)));
}

/**
 * Builds the weekly report for the seven days starting at `weekStartISO` (a
 * Monday). Aggregates expenses into per-day and per-category totals and finds
 * the highest-spend day.
 */
export async function getWeeklyReport(weekStartISO: string): Promise<WeeklyReport> {
  const weekEnd = addDays(weekStartISO, 6);
  const [expenses, income, categories] = await Promise.all([
    getExpensesByDateRange(weekStartISO, weekEnd),
    getIncomeByDateRange(weekStartISO, weekEnd),
    getAllCategories(),
  ]);

  const labelOf = categoryLabelResolver(categories);
  const totalSpent = sumAmounts(expenses);
  const totalIncome = sumAmounts(income);

  const spendingByDay: DaySpend[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStartISO, i);
    const amount = sumAmounts(expenses.filter((e) => e.date === date));
    return { date, amount };
  });

  const peakDay =
    totalSpent === 0
      ? null
      : spendingByDay.reduce((max, day) => (day.amount > max.amount ? day : max));

  return {
    weekStart: weekStartISO,
    weekEnd,
    totalSpent,
    totalIncome,
    topCategories: rankedCategories(expenses, labelOf, totalSpent, 3),
    spendingByDay,
    peakDay,
  };
}

/**
 * Builds the per-category month-over-month comparison. Only categories that had
 * spending in at least one of the two months are included. `pctChange` is null
 * when the previous amount was 0 (undefined growth rate).
 */
export async function getMonthComparison(
  monthISO: string,
  previousMonthISO: string,
): Promise<MonthComparison> {
  const [currentExpenses, previousExpenses, categories] = await Promise.all([
    getExpensesByDateRange(`${monthISO}-01`, lastDayOfMonth(monthISO)),
    getExpensesByDateRange(`${previousMonthISO}-01`, lastDayOfMonth(previousMonthISO)),
    getAllCategories(),
  ]);

  const labelOf = categoryLabelResolver(categories);
  const currentByCat = sumByCategory(currentExpenses);
  const previousByCat = sumByCategory(previousExpenses);
  const ids = new Set<number>([...currentByCat.keys(), ...previousByCat.keys()]);

  const deltas: CategoryDelta[] = [];
  for (const categoryId of ids) {
    const current = currentByCat.get(categoryId) ?? 0;
    const previous = previousByCat.get(categoryId) ?? 0;
    if (current === 0 && previous === 0) continue;
    deltas.push({
      categoryId,
      categoryLabel: labelOf(categoryId),
      current,
      previous,
      pctChange: previous > 0 ? ((current - previous) / previous) * 100 : null,
    });
  }

  return { month: monthISO, previousMonth: previousMonthISO, categories: deltas };
}

/**
 * Rule-based optimization suggestions. Implements the single VS-14 rule: any
 * category whose spending increased > 10% vs the previous month earns a
 * "review it" prompt. Categories with no prior-month spend (null pctChange) are
 * skipped — a first-time spend is not an increase.
 */
export function generateSuggestions(
  comparison: { categories: CategoryDelta[] } | null,
): OptimizationSuggestion[] {
  if (!comparison) return [];
  return comparison.categories
    .filter((d): d is CategoryDelta & { pctChange: number } => d.pctChange !== null && d.pctChange > 10)
    .map((d) => ({
      type: 'increase' as const,
      categoryLabel: d.categoryLabel,
      pctChange: d.pctChange,
      message: `${d.categoryLabel} spending increased ${Math.round(d.pctChange)}% vs last month — review it.`,
    }));
}

/**
 * Builds the full monthly report: income vs expenses, allocation performance,
 * category breakdown, debt summary, month-over-month
 * comparison, and optimization suggestions. The comparison (and its
 * suggestions) is omitted when neither month had any spending.
 */
export async function getMonthlyReport(monthISO: string): Promise<MonthlyReport> {
  const firstDay = `${monthISO}-01`;
  const lastDay = lastDayOfMonth(monthISO);

  const [budget, expenses, categories, debt] = await Promise.all([
    getMonthlyBudget(monthISO),
    getExpensesByDateRange(firstDay, lastDay),
    getAllCategories(),
    getOutstandingTotals(),
  ]);
  // The same resolution the Budget tab uses: the explicit total when the user
  // set one, the month's income otherwise.
  const planned = (await buildMonthlyPlan(monthISO, budget.incomeTotal)).totalBudget;

  const labelOf = categoryLabelResolver(categories);
  const actual = sumAmounts(expenses);

  let comparison: MonthComparison | null = null;
  try {
    const cmp = await getMonthComparison(monthISO, prevMonthISO(monthISO));
    comparison = cmp.categories.length > 0 ? cmp : null;
  } catch {
    comparison = null;
  }

  return {
    month: monthISO,
    incomeTotal: budget.incomeTotal,
    expensePerformance: {
      planned,
      actual,
      remaining: planned - actual,
    },
    categoryBreakdown: rankedCategories(expenses, labelOf, actual, Number.POSITIVE_INFINITY),
    debtSummary: { totalLent: debt.lent, totalOwed: debt.owed },
    comparison,
    suggestions: generateSuggestions(comparison),
  };
}
