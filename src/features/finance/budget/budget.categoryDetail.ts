import { costTypeResolver, spendKindOf } from '@/features/finance/expenses/expenses.costType';
import {
  getAllCategories,
  getExpensesByDateRange,
} from '@/features/finance/expenses/expenses.service';
import type { Category, Expense } from '@/features/finance/expenses/expenses.types';
import { firstDayOfMonth, lastDayOfMonth } from '@/utils/monthMath';

import { suggestFromHistory } from './budget.suggestions';
import type {
  CategoryDetail,
  CategorySpendPart,
  LargestSpend,
  RepeatedSpend,
} from './budget.types';

/**
 * A category's month, taken apart (VS-56): which subcategories the money went
 * to, which small purchases keep coming back, the biggest single purchases,
 * how much of it is fixed, and how the month compares with a usual one. It is
 * the "where should I cut?" view behind each envelope on the Budget tab.
 *
 * Refunds are negative rows in the purchase's category and subcategory
 * (VS-45), so they net out of the totals and the split on their own. The
 * purchase lists skip them and subtract them from the purchase they refund.
 */

const MAX_REPEATS = 3;
const MAX_LARGEST = 5;

/** A note reduced to what makes two notes "the same": trimmed, lower-case. */
function noteKey(note: string | null): string | null {
  const key = note?.trim().toLowerCase() ?? '';
  return key === '' ? null : key;
}

/** Newest first: date, then creation time. */
function newestFirst(a: Expense, b: Expense): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id;
}

function buildParts(expenses: ReadonlyArray<Expense>, spent: number, nameOf: Map<number, string>) {
  if (!expenses.some((e) => e.subcategoryId !== null)) return [];

  const parts = new Map<number | null, CategorySpendPart>();
  for (const e of expenses) {
    const part = parts.get(e.subcategoryId) ?? {
      subcategoryId: e.subcategoryId,
      name: e.subcategoryId === null ? null : nameOf.get(e.subcategoryId) ?? null,
      amount: 0,
      count: 0,
      sharePct: 0,
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

function buildRepeats(purchases: ReadonlyArray<Expense>): RepeatedSpend[] {
  const groups = new Map<string, RepeatedSpend>();
  // Oldest first, so the label is the note as the user first wrote it.
  for (const e of [...purchases].reverse()) {
    const key = noteKey(e.note);
    if (key === null) continue;
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

function buildLargest(
  purchases: ReadonlyArray<Expense>,
  refunded: Map<number, number>,
  nameOf: Map<number, string>,
): LargestSpend[] {
  return purchases
    .map((e) => ({
      id: e.id,
      amount: e.amount - (refunded.get(e.id) ?? 0),
      date: e.date,
      note: e.note,
      subcategoryName: e.subcategoryId === null ? null : nameOf.get(e.subcategoryId) ?? null,
    }))
    .filter((l) => l.amount > 0)
    // Stable sort over a newest-first list, so the newer purchase wins a tie.
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_LARGEST);
}

/**
 * Takes one category's month apart. Pure.
 *
 * @param expenses Every row of the category in the month, refunds included.
 * @param categories The full category tree, for subcategory names and cost types.
 * @param average The category's usual month, or null.
 */
export function buildCategoryDetail(
  categoryId: number,
  month: string,
  expenses: ReadonlyArray<Expense>,
  categories: ReadonlyArray<Category>,
  average: number | null,
): CategoryDetail {
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  const ordered = [...expenses].sort(newestFirst);
  const purchases = ordered.filter((e) => e.refundOf === null);
  const spent = ordered.reduce((sum, e) => sum + e.amount, 0);

  const refunded = new Map<number, number>();
  for (const e of ordered) {
    if (e.refundOf !== null) refunded.set(e.refundOf, (refunded.get(e.refundOf) ?? 0) - e.amount);
  }

  const kindOf = costTypeResolver(categories);
  const kinds = { fixed: 0, variable: 0, unexpected: 0 };
  for (const e of ordered) kinds[spendKindOf(e, kindOf)] += e.amount;

  return {
    categoryId,
    categoryName: nameOf.get(categoryId) ?? '',
    month,
    spent,
    parts: buildParts(ordered, spent, nameOf),
    repeats: buildRepeats(purchases),
    largest: buildLargest(purchases, refunded, nameOf),
    kinds: {
      fixed: Math.max(0, kinds.fixed),
      variable: Math.max(0, kinds.variable),
      unexpected: Math.max(0, kinds.unexpected),
    },
    average,
  };
}

/**
 * Loads one category's month and takes it apart. The usual month is the
 * planner's own average (`suggestFromHistory`: complete months only), so the
 * drill-down and "Use my averages" never disagree.
 */
export async function getCategoryDetail(monthISO: string, categoryId: number): Promise<CategoryDetail> {
  const [expenses, categories, averages] = await Promise.all([
    getExpensesByDateRange(firstDayOfMonth(monthISO), lastDayOfMonth(monthISO)),
    getAllCategories(),
    suggestFromHistory(monthISO),
  ]);

  return buildCategoryDetail(
    categoryId,
    monthISO,
    expenses.filter((e) => e.categoryId === categoryId),
    categories,
    averages.get(categoryId) ?? null,
  );
}
