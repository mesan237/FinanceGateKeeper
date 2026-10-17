import { getMonthCoverage } from '@/features/finance/expenses/expenses.coverage';
import { prevMonthISO } from '@/utils/monthMath';

import { getSpendByCategory } from './budget.envelopes';

/**
 * The planner's "Use my averages" suggestion, split out of `budget.plan.ts`
 * for the 300-line ceiling (VS-49). `budget.plan` re-exports it.
 */

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
