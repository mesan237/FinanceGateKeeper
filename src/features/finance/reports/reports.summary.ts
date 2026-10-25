import type { CategorySpend } from './reports.types';

/** How many categories the Reports summary sentence names. */
const NAMED = 2;

/**
 * The conclusion of the month's category breakdown, for the one-sentence
 * summary at the top of Reports (UX-14): the biggest categories by amount and
 * the whole-percent share of spending they took together. Null without
 * categories. Pure.
 */
export function topCategoriesShare(
  breakdown: ReadonlyArray<CategorySpend>,
): { labels: string[]; sharePct: number } | null {
  if (breakdown.length === 0) return null;
  const top = [...breakdown].sort((a, b) => b.amount - a.amount).slice(0, NAMED);
  return {
    labels: top.map((c) => c.categoryLabel),
    sharePct: Math.round(top.reduce((sum, c) => sum + c.pct, 0)),
  };
}
