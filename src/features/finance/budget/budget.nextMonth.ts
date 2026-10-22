import type { CategoryDetail, NextMonthPlan, NextMonthStep } from './budget.types';

/**
 * "How do I spend less here next month?" (VS-56). Pure rules over a category's
 * detail, kept deliberately simple so every number on the card can be checked
 * by hand:
 *
 * - **Above a usual month** (more than 5% over): aim for the usual month.
 * - **At or below it, or no usual month yet:** trim the non-fixed part by 10%.
 * - **Only fixed bills:** nothing to cut.
 *
 * The target never goes below the month's fixed bills. The steps say where the
 * difference can come from: subcategories running more than 10% above their own
 * usual month, and a purchase bought four or more times (skip one in four).
 */

/** Above the usual month by more than this share, the category plans back to it. */
const OVER_USUAL = 0.05;
/** A subcategory is worth naming once it runs this far above its own usual month. */
const PART_OVER_USUAL = 0.1;
/** The trim applied to non-fixed spending when the month is already at or below usual. */
const TRIM = 0.1;
/** Purchases bought at least this often get the "skip one in four" step. */
const MIN_REPEAT_COUNT = 4;
const MAX_PART_STEPS = 2;

/**
 * Whole-percent change from `usual` to `now`; null when there is no usual figure
 * or it is zero (a percentage against nothing means nothing).
 */
export function percentChange(now: number, usual: number | null): number | null {
  if (usual === null || usual <= 0) return null;
  return Math.round(((now - usual) / usual) * 100);
}

/** Rounds down to a friendly amount: 500 FCFA steps, or 100 below 10,000. */
function roundDown(amount: number): number {
  const step = amount >= 10_000 ? 500 : 100;
  return Math.floor(amount / step) * step;
}

/**
 * Suggests next month's budget for a category and the steps to get there.
 *
 * @param heading Where this month is heading: the envelope's projection for the
 *   current month, what was spent for a closed one. Parts and repeats are scaled
 *   by `heading / spent`, so a running month is judged on its pace.
 * @returns null for a month with no spending.
 */
export function planNextMonth(detail: CategoryDetail, heading: number): NextMonthPlan | null {
  if (heading <= 0) return null;

  const current = Math.round(heading);
  const scale = detail.spent > 0 ? heading / detail.spent : 1;
  const fixed = Math.round(detail.kinds.fixed);
  const cuttable = (detail.kinds.variable + detail.kinds.unexpected) * scale;

  if (cuttable <= 0) {
    return { method: 'fixed', current, target: current, changePct: 0, fixed, steps: [] };
  }

  const usual = detail.average;
  const aboveUsual = usual !== null && usual > 0 && heading > usual * (1 + OVER_USUAL);
  const method = aboveUsual ? 'usual' : 'trim';
  const aim = aboveUsual ? usual : heading - cuttable * TRIM;
  const target = Math.max(fixed, roundDown(aim));

  const partSteps: NextMonthStep[] = detail.parts
    .filter((p) => p.usual !== null && p.amount * scale > p.usual * (1 + PART_OVER_USUAL))
    .map((p) => ({
      kind: 'backToUsual' as const,
      name: p.name,
      saving: Math.round(p.amount * scale - (p.usual ?? 0)),
    }))
    .sort((a, b) => b.saving - a.saving)
    .slice(0, MAX_PART_STEPS);

  const repeat = detail.repeats.find((r) => r.count >= MIN_REPEAT_COUNT);
  const repeatSteps: NextMonthStep[] = repeat
    ? [{ kind: 'fewerRepeats', label: repeat.label, count: repeat.count, saving: Math.round((repeat.total * scale) / 4) }]
    : [];

  return {
    method,
    current,
    target,
    changePct: percentChange(target, current),
    fixed,
    steps: [...partSteps, ...repeatSteps],
  };
}
