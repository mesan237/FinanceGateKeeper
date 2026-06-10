import { TIMELINE_SHIFT_THRESHOLD_MONTHS } from '@/constants/projects';
import { addMonths, toISODate } from '@/utils/formatDate';

import type { Project, TimelineEstimate, TimelineShift } from './projects.types';

/**
 * Estimates when a project will be fully funded, given a monthly funding rate.
 * Pure — no DB. `monthsRemaining = ceil((target − funded) / monthlyRate)` and
 * `completionDate = addMonths(today, monthsRemaining)`. Returns nulls when
 * there is no rate to project from (`monthlyRate <= 0`); returns `0` / today
 * when the project is already fully funded.
 *
 * @param project The project to estimate.
 * @param monthlyRate The project's monthly funding (FCFA); typically the
 *   current month's projects-bucket amount from the budget.
 * @param todayISO Reference "today" (default: today). Injectable for tests.
 */
export function estimateTimeline(
  project: Project,
  monthlyRate: number,
  todayISO: string = toISODate(new Date()),
): TimelineEstimate {
  const remaining = project.targetAmount - project.fundedAmount;
  if (remaining <= 0) {
    return { projectId: project.id, monthsRemaining: 0, completionDate: todayISO };
  }
  if (monthlyRate <= 0) {
    return { projectId: project.id, monthsRemaining: null, completionDate: null };
  }
  const monthsRemaining = Math.ceil(remaining / monthlyRate);
  return {
    projectId: project.id,
    monthsRemaining,
    completionDate: addMonths(todayISO, monthsRemaining),
  };
}

/**
 * Compares two estimates for the same project and reports a shift only when the
 * months-remaining delta is at least `TIMELINE_SHIFT_THRESHOLD_MONTHS` (so tiny
 * rounding wobble doesn't nag). Returns `null` when unchanged, below threshold,
 * or either estimate has no comparable month count. Pure.
 */
export function detectShift(
  previous: TimelineEstimate,
  next: TimelineEstimate,
): TimelineShift | null {
  if (previous.monthsRemaining === null || next.monthsRemaining === null) return null;
  const shiftedMonths = next.monthsRemaining - previous.monthsRemaining;
  if (Math.abs(shiftedMonths) < TIMELINE_SHIFT_THRESHOLD_MONTHS) return null;
  return {
    projectId: next.projectId,
    previous: previous.completionDate,
    next: next.completionDate,
    shiftedMonths,
  };
}
