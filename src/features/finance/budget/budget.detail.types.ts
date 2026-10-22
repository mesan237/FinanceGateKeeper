import type { ReasonEvent, ReasonTotals } from '@/types/reasons';

/**
 * Types for the category drill-down (VS-56, VS-59, VS-62), split from
 * `budget.types.ts` for the 300-line ceiling; `budget.types` re-exports them.
 */

/** One subcategory's share of a category's month (VS-56). */
export interface CategorySpendPart {
  /** null for spending filed under the category itself. */
  subcategoryId: number | null;
  /** Stored subcategory name; null with `subcategoryId`. */
  name: string | null;
  /** Net of refunds. */
  amount: number;
  /** Purchases in the part (refunds not counted). */
  count: number;
  /** Share of the category's net spend, 0–100. */
  sharePct: number;
  /** The part's usual month, over the category's complete months; null until one is complete. */
  usual: number | null;
}

/** Purchases that share a note — "Taxi ×18" (VS-56). */
export interface RepeatedSpend {
  /** The note as first written. */
  label: string;
  count: number;
  total: number;
}

/**
 * Narrows the drill-down to one subcategory (VS-59): its id, or `'none'` for the
 * spending filed under the category itself.
 */
export type SubcategoryFilter = number | 'none';

/** Where a category's money went in one month: the Budget tab's drill-down (VS-56). */
export interface CategoryDetail {
  categoryId: number;
  /** Stored name; show it with `displayCategoryName`. */
  categoryName: string;
  /**
   * The subcategory the detail is narrowed to (VS-59): `id` and `name` null for
   * spending with no subcategory. null for the whole category.
   */
  subcategory: { id: number | null; name: string | null } | null;
  month: string;
  /** Net spend, refunds included. */
  spent: number;
  /** Split by subcategory, largest first. Empty when no expense uses a subcategory. */
  parts: CategorySpendPart[];
  /** Up to three notes repeated across purchases, by total. */
  repeats: RepeatedSpend[];
  /** What can and cannot easily be cut, by `spendKindOf`. */
  kinds: { fixed: number; variable: number; unexpected: number };
  /**
   * Average over the complete months among the three before this one; null
   * until one is complete, 0 when those months had no spend here.
   */
  average: number | null;
  /** Why the money went (VS-62): routine, events, unexpected, everyday. */
  reasons: ReasonTotals;
  /** The events behind `reasons.event`, largest first. */
  reasonEvents: ReasonEvent[];
}

/** One concrete way to spend less in a category next month (VS-56). */
export type NextMonthStep =
  /** A subcategory running above its usual month; `name` null is spending with no subcategory. */
  | { kind: 'backToUsual'; name: string | null; saving: number }
  /** A purchase that keeps coming back: skipping one in four. */
  | { kind: 'fewerRepeats'; label: string; count: number; saving: number };

/** A suggested budget for next month, and how to get there (VS-56). */
export interface NextMonthPlan {
  /**
   * `usual`: this month runs above a usual month, so aim for the usual one.
   * `trim`: already at or below usual (or no usual yet), so trim day-to-day spending by 10%.
   * `fixed`: only fixed bills, nothing to cut.
   */
  method: 'usual' | 'trim' | 'fixed';
  /** Where this month is heading (pace for the current month), whole FCFA. */
  current: number;
  /** The suggested budget, rounded to 500 FCFA and never below the fixed bills. */
  target: number;
  /** `target` against `current`, whole percent; null when `current` is 0. */
  changePct: number | null;
  /** Fixed bills in the month: they stay. */
  fixed: number;
  /** At most three, biggest saving first. */
  steps: NextMonthStep[];
}
