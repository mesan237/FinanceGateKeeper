import { execute } from '@/services/database';

import type { Category, CostType } from './expenses.types';

/**
 * Fixed or variable categories (VS-41). A fixed category holds commitments the
 * user cannot change day to day (rent, school fees); a variable one holds the
 * spending they can act on (food, taxi). The "typical month" profile splits a
 * month on this, so the user sees which part of their spending is negotiable.
 *
 * Stored as nullable `categories.cost_type`: null on a parent reads as
 * variable, null on a subcategory inherits its parent.
 */

/** Sets a category's cost type, or clears it back to "variable / inherit" with null. */
export async function setCategoryCostType(id: number, costType: CostType | null): Promise<void> {
  await execute('UPDATE categories SET cost_type = ? WHERE id = ?', [costType, id]);
}

/**
 * Builds a lookup that says whether an expense filed under
 * (`categoryId`, `subcategoryId`) is fixed or variable. A tagged subcategory
 * wins over its parent; an untagged one inherits it; an untagged parent, or a
 * category that no longer exists, reads as variable.
 */
export function costTypeResolver(
  categories: ReadonlyArray<Category>,
): (categoryId: number, subcategoryId: number | null) => CostType {
  const tagOf = new Map(categories.map((c) => [c.id, c.costType]));
  return (categoryId, subcategoryId) => {
    const own = subcategoryId === null ? null : tagOf.get(subcategoryId) ?? null;
    return own ?? tagOf.get(categoryId) ?? 'variable';
  };
}

/** The facts that decide how one expense counts in a month's spending. */
export interface SpendFacts {
  categoryId: number;
  subcategoryId: number | null;
  isRecurring: boolean;
  isUnplanned: boolean;
}

/**
 * How an expense counts: a surprise first (an imprévu is never a habit), then
 * an auto-logged recurring bill as fixed, then its category's tag. The one
 * rule for the typical-month profile and the observed essentials (VS-50). Pure.
 */
export function spendKindOf(
  expense: SpendFacts,
  kindOf: (categoryId: number, subcategoryId: number | null) => CostType,
): 'fixed' | 'variable' | 'unexpected' {
  if (expense.isUnplanned) return 'unexpected';
  if (expense.isRecurring) return 'fixed';
  return kindOf(expense.categoryId, expense.subcategoryId);
}

/** The cost type a category actually has once inheritance is applied. */
export function effectiveCostType(category: Category, categories: ReadonlyArray<Category>): CostType {
  const resolve = costTypeResolver(categories);
  return category.parentId === null
    ? resolve(category.id, null)
    : resolve(category.parentId, category.id);
}

/**
 * The tag to store when the user flips a category between fixed and variable.
 * A parent stores `fixed`, or null for variable. A subcategory stores null when
 * the flip lands on its parent's type (it inherits again), and the explicit
 * type only when it differs — so a later change to the parent still flows down.
 */
export function toggledCostTypeTag(
  category: Category,
  categories: ReadonlyArray<Category>,
): CostType | null {
  const next: CostType = effectiveCostType(category, categories) === 'fixed' ? 'variable' : 'fixed';
  if (category.parentId === null) return next === 'fixed' ? 'fixed' : null;
  const parent = categories.find((c) => c.id === category.parentId);
  const parentType = parent ? effectiveCostType(parent, categories) : 'variable';
  return next === parentType ? null : next;
}
