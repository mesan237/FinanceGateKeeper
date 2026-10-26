import type { JourneyFigures, JourneyStepKey } from '@/types/journey';

/** A line under the Home hero figure that the journey step adds (UX-24). */
export type HeroNote =
  | { kind: 'typical'; amount: number }
  | { kind: 'variable'; month: string; latest: number; start: number };

/** What Home's hero leads with: the spent view or the plan, and an optional note. */
export interface HeroLead {
  /** True to lead with what was spent and the days logged instead of the plan. */
  spentView: boolean;
  note: HeroNote | null;
}

/**
 * What Home's hero leads with at each journey step (UX-24, 04 §7.3):
 *
 * - Observe: what was spent and the days logged, even with a plan.
 * - See: the same, with the typical month.
 * - Plan, Grow: what is left in the plan.
 * - Optimize: the plan, with variable spending against the start.
 *
 * A month without a plan always leads with what was spent (UX-04). With the
 * step unknown, only the plan decides. Pure.
 */
export function heroLead(
  stage: JourneyStepKey | null,
  planned: boolean,
  figures: JourneyFigures | null,
): HeroLead {
  const observing = stage === 'observe' || stage === 'see';
  const spentView = !planned || observing;

  if (stage === 'see' && figures?.typicalMonth != null) {
    return { spentView, note: { kind: 'typical', amount: figures.typicalMonth } };
  }
  if (stage === 'optimize' && figures?.variableLatest && figures.variableStart != null) {
    return {
      spentView,
      note: {
        kind: 'variable',
        month: figures.variableLatest.month,
        latest: figures.variableLatest.amount,
        start: figures.variableStart,
      },
    };
  }
  return { spentView, note: null };
}
