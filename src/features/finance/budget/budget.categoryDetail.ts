import { costTypeResolver, spendKindOf } from '@/features/finance/expenses/expenses.costType';
import { getMonthCoverage } from '@/features/finance/expenses/expenses.coverage';
import {
  getAllCategories,
  getExpensesByDateRange,
} from '@/features/finance/expenses/expenses.service';
import type { Category, Expense } from '@/features/finance/expenses/expenses.types';
import { query } from '@/services/database';
import { firstDayOfMonth, lastDayOfMonth, prevMonthISO } from '@/utils/monthMath';

import type {
  CategoryDetail,
  CategorySpendPart,
  RepeatedSpend,
  SubcategoryFilter,
} from './budget.types';

/**
 * A category's month, taken apart (VS-56): which subcategories the money went
 * to, which purchases keep coming back, how much of it is fixed, and how each
 * part compares with a usual month. It is the "where should I cut?" view behind
 * each envelope on the Budget tab.
 *
 * Refunds are negative rows in the purchase's category and subcategory
 * (VS-45), so they net out of the totals and the split on their own. Repeats
 * skip them: a refund is not a purchase.
 */

const MAX_REPEATS = 3;
/** How many months before this one a usual month looks back on — the planner's window. */
const LOOKBACK = 3;

/** The category's usual month: overall and per subcategory. */
export interface UsualSpend {
  /** null until a month in the window is complete. */
  total: number | null;
  /** Per subcategory (null key = no subcategory); empty until a month is complete. */
  bySubcategory: Map<number | null, number>;
  /** How many complete months the averages are over. */
  months: number;
}

/** A note reduced to what makes two notes "the same": trimmed, lower-case. */
function noteKey(note: string | null): string | null {
  const key = note?.trim().toLowerCase() ?? '';
  return key === '' ? null : key;
}

function buildParts(
  expenses: ReadonlyArray<Expense>,
  spent: number,
  nameOf: Map<number, string>,
  usual: UsualSpend,
): CategorySpendPart[] {
  if (!expenses.some((e) => e.subcategoryId !== null)) return [];

  const parts = new Map<number | null, CategorySpendPart>();
  for (const e of expenses) {
    const part = parts.get(e.subcategoryId) ?? {
      subcategoryId: e.subcategoryId,
      name: e.subcategoryId === null ? null : nameOf.get(e.subcategoryId) ?? null,
      amount: 0,
      count: 0,
      sharePct: 0,
      usual: usual.months > 0 ? usual.bySubcategory.get(e.subcategoryId) ?? 0 : null,
    };
    part.amount += e.amount;
    if (e.refundOf === null) part.count += 1;
    parts.set(e.subcategoryId, part);
  }

  return [...parts.values()]
    .filter((p) => p.amount > 0)
    .map((p) => ({ ...p, sharePct: spent > 0 ? (p.amount / spent) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

function buildRepeats(expenses: ReadonlyArray<Expense>): RepeatedSpend[] {
  const groups = new Map<string, RepeatedSpend>();
  // Oldest first, so the label is the note as the user first wrote it.
  const oldestFirst = [...expenses].sort((a, b) =>
    a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1,
  );
  for (const e of oldestFirst) {
    const key = noteKey(e.note);
    if (key === null || e.refundOf !== null) continue;
    const group = groups.get(key) ?? { label: e.note!.trim(), count: 0, total: 0 };
    group.count += 1;
    group.total += e.amount;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_REPEATS);
}

/**
 * Takes one category's month apart. Pure.
 *
 * @param expenses Every row of the category in the month, refunds included.
 * @param categories The full category tree, for subcategory names and cost types.
 * @param usual The category's usual month.
 * @param subcategory When set, `expenses` are already that subcategory's and
 *   `usual` is its own; the split is left empty (VS-59).
 */
export function buildCategoryDetail(
  categoryId: number,
  month: string,
  expenses: ReadonlyArray<Expense>,
  categories: ReadonlyArray<Category>,
  usual: UsualSpend,
  subcategory: CategoryDetail['subcategory'] = null,
): CategoryDetail {
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);

  const kindOf = costTypeResolver(categories);
  const kinds = { fixed: 0, variable: 0, unexpected: 0 };
  for (const e of expenses) kinds[spendKindOf(e, kindOf)] += e.amount;

  return {
    categoryId,
    categoryName: nameOf.get(categoryId) ?? '',
    subcategory,
    month,
    spent,
    parts: subcategory ? [] : buildParts(expenses, spent, nameOf, usual),
    repeats: buildRepeats(expenses),
    kinds: {
      fixed: Math.max(0, kinds.fixed),
      variable: Math.max(0, kinds.variable),
      unexpected: Math.max(0, kinds.unexpected),
    },
    average: usual.total,
  };
}

/**
 * The category's usual month: its average over the **complete** months among
 * the three before `monthISO`, overall and per subcategory. The same window and
 * the same "complete months only, a month without spend is a real zero" rule as
 * the planner's "Use my averages" (`suggestFromHistory`), so the two agree.
 */
export async function getUsualSpend(monthISO: string, categoryId: number): Promise<UsualSpend> {
  const window: string[] = [];
  let cursor = monthISO;
  for (let i = 0; i < LOOKBACK; i += 1) {
    cursor = prevMonthISO(cursor);
    window.push(cursor);
  }
  const coverage = await Promise.all(window.map(getMonthCoverage));
  const complete = coverage.filter((c) => c.isComplete).map((c) => c.month);
  if (complete.length === 0) return { total: null, bySubcategory: new Map(), months: 0 };

  const rows = await query<{ subcategory_id: number | null; total: number }>(
    `SELECT subcategory_id, COALESCE(SUM(amount), 0) AS total FROM expenses
      WHERE category_id = ? AND substr(date, 1, 7) IN (${complete.map(() => '?').join(', ')})
      GROUP BY subcategory_id`,
    [categoryId, ...complete],
  );

  const bySubcategory = new Map(
    rows.map((r) => [r.subcategory_id, Math.round(r.total / complete.length)] as const),
  );
  const sum = rows.reduce((acc, r) => acc + r.total, 0);
  return { total: Math.round(sum / complete.length), bySubcategory, months: complete.length };
}

/**
 * Loads one category's month and takes it apart — or, with `subcategory`, just
 * that subcategory's part of it (VS-59), compared with its own usual month.
 */
export async function getCategoryDetail(
  monthISO: string,
  categoryId: number,
  subcategory?: SubcategoryFilter,
): Promise<CategoryDetail> {
  const [expenses, categories, usual] = await Promise.all([
    getExpensesByDateRange(firstDayOfMonth(monthISO), lastDayOfMonth(monthISO)),
    getAllCategories(),
    getUsualSpend(monthISO, categoryId),
  ]);
  const inCategory = expenses.filter((e) => e.categoryId === categoryId);
  if (subcategory === undefined) return buildCategoryDetail(categoryId, monthISO, inCategory, categories, usual);

  const subId = subcategory === 'none' ? null : subcategory;
  const subUsual: UsualSpend = {
    total: usual.months > 0 ? usual.bySubcategory.get(subId) ?? 0 : null,
    bySubcategory: new Map(),
    months: usual.months,
  };
  return buildCategoryDetail(
    categoryId,
    monthISO,
    inCategory.filter((e) => e.subcategoryId === subId),
    categories,
    subUsual,
    { id: subId, name: subId === null ? null : categories.find((c) => c.id === subId)?.name ?? null },
  );
}
