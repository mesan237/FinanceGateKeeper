import type { ProfileCategory } from '@/features/finance/reports/reports.types';

import type { CutSuggestion } from './journey.types';

/** How many suggestions the Optimize step shows (UX-25). */
const SHOWN = 3;

/** What a cut frees is rounded down to this, so a suggestion never promises too much. */
const STEP = 500;

/**
 * Where variable spending has room (UX-25, VS-65): for each variable category
 * of the starting point, what matching its own cheapest month would free each
 * month — a cut the user has already managed once, not a generic rule. The
 * three biggest, a category that never varied left out. Suggestions only: the
 * user sets no target. Pure.
 */
export function cutSuggestions(variableCategories: ReadonlyArray<ProfileCategory>): CutSuggestion[] {
  return variableCategories
    .map((c) => ({
      categoryId: c.categoryId,
      categoryLabel: c.categoryLabel,
      average: c.average,
      lowest: c.lowest,
      frees: Math.floor(Math.max(0, c.average - c.lowest) / STEP) * STEP,
    }))
    .filter((s) => s.frees > 0)
    .sort((a, b) => b.frees - a.frees)
    .slice(0, SHOWN);
}
