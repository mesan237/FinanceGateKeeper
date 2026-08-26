import {
  getAllCategories,
  getExpensesByDateRange,
} from '@/features/finance/expenses/expenses.service';
import { toISODate } from '@/utils/formatDate';
import {
  daysInMonth,
  firstDayOfMonth,
  lastDayOfMonth,
  prevMonthISO,
  weeksInMonth,
} from '@/utils/monthMath';

import { getSpendByCategory } from './budget.envelopes';
import { buildBurndown, buildWeeklyTrend } from './budget.progress';
import type { CategoryBudgetProgress } from './budget.types';

/**
 * The Budget tab's analytics (VS-33).
 *
 * Every figure here has to answer a question the user can act on. Anything that
 * would only restate what the envelope rows already say — a spending pie, a
 * daily sparkline — is deliberately absent: Reports owns the donut and the
 * Dashboard owns the sparkline, and duplicating them would add pixels without
 * adding a decision.
 */

/** How much a category consumes of the month's whole budget. */
export interface BudgetShare {
  categoryId: number;
  categoryName: string;
  spent: number;
  /** Share of the month's total available budget, 0–100. */
  shareOfBudgetPct: number;
}

/** One category's spend this month against the same category last month. */
export interface CategoryTrend {
  categoryId: number;
  categoryName: string;
  current: number;
  previous: number;
  /** Percentage change; `null` when the category had no spend last month. */
  changePct: number | null;
}

export interface BudgetTrend {
  /** Spend per 7-day bucket, oldest first. */
  weekly: number[];
  /** What one week's even-pace spend would be. */
  weeklyPace: number;
  burndown: { day: number; ideal: number; actual: number }[];
}

/**
 * Ranks categories by how much of the **month's budget** each one consumes.
 *
 * Deliberately share-of-budget rather than the more common share-of-spend: a
 * category taking 40% of what you spent is only interesting once you know
 * whether that is 40% of a plan you can afford. Categories with no spend are
 * dropped. Pure.
 */
export function rankByBudgetShare(
  categories: ReadonlyArray<CategoryBudgetProgress>,
  totalAvailable: number,
  limit: number = 5,
): BudgetShare[] {
  return categories
    .filter((c) => c.spent > 0)
    .map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      spent: c.spent,
      shareOfBudgetPct: totalAvailable > 0 ? (c.spent / totalAvailable) * 100 : 0,
    }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, limit);
}

/**
 * Weekly spend buckets and the ideal-vs-actual burn-down for `monthISO`.
 *
 * @param available The month's total spendable budget (plan total + carry).
 * @param todayISO Injectable for tests and for viewing a past month.
 */
export async function getBudgetTrend(
  monthISO: string,
  available: number,
  todayISO: string = toISODate(new Date()),
): Promise<BudgetTrend> {
  const expenses = await getExpensesByDateRange(
    firstDayOfMonth(monthISO),
    lastDayOfMonth(monthISO),
  );

  const weeks = weeksInMonth(monthISO);
  return {
    weekly: buildWeeklyTrend(expenses, monthISO),
    weeklyPace: weeks > 0 ? (available / daysInMonth(monthISO)) * 7 : 0,
    burndown: buildBurndown(expenses, available, monthISO, todayISO),
  };
}

/**
 * Per-category spend for `monthISO` against the month before it.
 *
 * Only categories that had spending in at least one of the two months appear,
 * sorted by the size of the change — a comparison is worth showing only where
 * something actually moved. Returns an empty array when the previous month has
 * no data at all, so a first-time user is not shown a table of meaningless
 * "+100%" rows.
 */
export async function getMonthOverMonth(monthISO: string): Promise<CategoryTrend[]> {
  const previousMonth = prevMonthISO(monthISO);
  const [current, previous, categories] = await Promise.all([
    getSpendByCategory(monthISO),
    getSpendByCategory(previousMonth),
    getAllCategories(),
  ]);

  if (previous.size === 0) return [];

  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const ids = new Set<number>([...current.keys(), ...previous.keys()]);

  return [...ids]
    .map((categoryId) => {
      const now = current.get(categoryId) ?? 0;
      const before = previous.get(categoryId) ?? 0;
      return {
        categoryId,
        categoryName: nameOf.get(categoryId) ?? 'Uncategorised',
        current: now,
        previous: before,
        changePct: before > 0 ? ((now - before) / before) * 100 : null,
      };
    })
    .filter((t) => t.current > 0 || t.previous > 0)
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous));
}
