import { getBaselineFactValue, setBaselineFact } from '@/features/finance/budget/budget.baseline';
import { getSpendingProfile } from '@/features/finance/reports/reports.profile';
import { getStartingPoint } from '@/features/finance/reports/reports.startingPoint';
import { query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';
import { firstDayOfMonth, nextMonthISO, prevMonthISO } from '@/utils/monthMath';

import { getObserveLogging } from './journey.logging';
import { cutSuggestions } from './journey.suggestions';
import { JOURNEY_STEPS } from './journey.steps';
import type { Journey, JourneyEvidence, JourneyStep, JourneyStepKey } from './journey.types';

/**
 * The journey (VS-63): five steps to control over spending — observe, see,
 * plan, optimize, grow. The step is worked out from the data every time it is
 * read, never from a mode switch (VS-34's Learning mode got stuck on one):
 *
 * 1. **Observe** is passed when the starting point's three complete months exist.
 * 2. **See** is passed when the user says they have seen what those months cost.
 * 3. **Plan** is passed by a complete month after the starting point that had a
 *    budget (an envelope or an explicit total).
 * 4. **Optimize** is passed by a complete month, from the planned one on, whose
 *    variable spending came in under the starting point's.
 * 5. **Grow** is never "done": it is where the journey continues.
 *
 * Steps pass in order. Once passed a step stays passed, even if an old entry is
 * corrected later, and the user may skip ahead. Both answers live in
 * `baseline_facts` (budget slice) with the user's other answers.
 */

/**
 * Works out the current step from the evidence. Pure.
 *
 * @returns The current step, every step's status, and how many steps the
 *   evidence (or an earlier read) has passed — `earned`, which is stored so a
 *   step never locks again.
 */
export function resolveJourney(evidence: JourneyEvidence): {
  current: JourneyStepKey;
  earned: number;
  steps: JourneyStep[];
} {
  const passed = [
    evidence.recordedMonths >= evidence.neededMonths,
    evidence.pictureReviewed,
    evidence.plannedMonth !== null,
    evidence.beatStartMonth !== null,
  ];
  const inOrder = passed.findIndex((p) => !p);
  const earned = Math.max(inOrder === -1 ? passed.length : inOrder, evidence.reached);
  const current = Math.max(earned, evidence.skippedTo);

  const steps = JOURNEY_STEPS.map((key, i): JourneyStep => {
    if (i === current) return { key, status: 'current' };
    if (i > current) return { key, status: 'locked' };
    return { key, status: i < earned ? 'done' : 'skipped' };
  });
  return { current: JOURNEY_STEPS[current], earned, steps };
}

/** Months with a budget in (`after`, `upTo`]: an envelope or an explicit total. */
async function getPlannedMonths(after: string, upTo: string): Promise<Set<string>> {
  const rows = await query<{ month: string }>(
    `SELECT month FROM category_budgets WHERE month > ? AND month <= ?
     UNION
     SELECT month FROM allocations WHERE total_budget IS NOT NULL AND month > ? AND month <= ?`,
    [after, upTo, after, upTo],
  );
  return new Set(rows.map((r) => r.month));
}

/** Each complete month in (`after`, `upTo`], oldest first, with its variable spending. */
async function getCompleteMonthsAfter(
  after: string,
  upTo: string,
): Promise<{ month: string; variable: number }[]> {
  const months: string[] = [];
  for (let m = nextMonthISO(after); m <= upTo; m = nextMonthISO(m)) months.push(m);
  const profiles = await Promise.all(
    months.map((m) => getSpendingProfile(firstDayOfMonth(nextMonthISO(m)), 1)),
  );
  return profiles.flatMap((p, i) =>
    p.average !== null && p.months[0]?.isComplete ? [{ month: months[i], variable: p.average.variable }] : [],
  );
}

/**
 * Reads the journey as of `todayISO`. When the evidence has passed more steps
 * than were stored, the new count is stored, so those steps never lock again.
 */
export async function getJourney(todayISO: string = toISODate(new Date())): Promise<Journey> {
  const [point, reviewed, reached, skipped, logging] = await Promise.all([
    getStartingPoint(todayISO),
    getBaselineFactValue('picture_reviewed'),
    getBaselineFactValue('journey_reached'),
    getBaselineFactValue('journey_skipped'),
    getObserveLogging(todayISO),
  ]);
  const start = point.profile?.average ?? null;

  let plannedMonth: string | null = null;
  let beatStartMonth: string | null = null;
  let latest: Journey['latest'] = null;
  if (start !== null) {
    const lastStart = point.recorded[point.recorded.length - 1];
    const lastClosed = prevMonthISO(todayISO.slice(0, 7));
    const [complete, planned] = await Promise.all([
      getCompleteMonthsAfter(lastStart, lastClosed),
      getPlannedMonths(lastStart, lastClosed),
    ]);
    plannedMonth = complete.find((m) => planned.has(m.month))?.month ?? null;
    if (plannedMonth !== null) {
      const from = plannedMonth;
      beatStartMonth = complete.find((m) => m.month >= from && m.variable < start.variable)?.month ?? null;
    }
    latest = complete[complete.length - 1] ?? null;
  }

  const resolved = resolveJourney({
    recordedMonths: point.recorded.length,
    neededMonths: point.needed,
    pictureReviewed: reviewed === 1,
    plannedMonth,
    beatStartMonth,
    reached: reached ?? 0,
    skippedTo: skipped ?? 0,
  });
  if (resolved.earned > (reached ?? 0)) await setBaselineFact('journey_reached', resolved.earned);

  return {
    current: resolved.current,
    steps: resolved.steps,
    observe: { recorded: point.recorded.length, needed: point.needed },
    logging,
    start,
    latest,
    suggestions: point.profile ? cutSuggestions(point.profile.variableCategories) : [],
    plannedMonth,
    beatStartMonth,
  };
}

/** Records "I've seen it" on the first months: passes the See step. */
export async function markPictureReviewed(): Promise<void> {
  await setBaselineFact('picture_reviewed', 1);
}

/**
 * Skips ahead to `step`. Going back is never recorded: a skip that lands at or
 * before the furthest skip so far changes nothing.
 */
export async function skipToStep(step: JourneyStepKey): Promise<void> {
  const target = JOURNEY_STEPS.indexOf(step);
  const skipped = (await getBaselineFactValue('journey_skipped')) ?? 0;
  if (target <= skipped) return;
  await setBaselineFact('journey_skipped', target);
}
