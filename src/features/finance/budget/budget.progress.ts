import {
  daysElapsedInMonth,
  daysInMonth,
  daysRemainingInMonth,
} from '@/utils/monthMath';

import type { BudgetHealth, CategoryBudgetProgress } from './budget.types';

/**
 * Pure budgeting arithmetic — pace, projection, health, and the rollover carry
 * chain. No database, no React, no dates beyond the `YYYY-MM(-DD)` strings
 * passed in.
 *
 * Split out of `budget.service.ts` (which is already at its 300-line ceiling)
 * for the same reason as `budget.redistribution.ts`: the interesting rules
 * deserve to be unit-testable without a SQLite instance.
 */

/** Consumption share at which a budget is worth flagging even if the pace is fine. */
const AT_RISK_CONSUMED_PCT = 80;

/**
 * Share of `available` already spent, as a percentage. **Not clamped** — a
 * return above 100 is the honest answer for an overspent envelope, and callers
 * that draw a bar clamp it themselves. Returns 0 when nothing is budgeted, so
 * an unbudgeted category never reads as "100% consumed".
 */
export function consumedPct(spent: number, available: number): number {
  if (available <= 0) return 0;
  return (spent / available) * 100;
}

/**
 * Average spend per elapsed day — the run-rate behind every projection. Days
 * are counted inclusive of today (see `daysElapsedInMonth`), so this is defined
 * from the very first day of a month.
 */
export function dailyAverage(spent: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return spent / daysElapsed;
}

/**
 * Where this month lands if the current run-rate holds to the last day. This is
 * the figure that turns "62% consumed on the 12th" into an actual warning.
 *
 * `fixedSpent` is the part of `spent` that does not recur daily — recurring
 * bills such as rent (VS-40). It is counted once rather than extrapolated, so
 * rent paid on the 1st does not project as thirty rents.
 */
export function projectSpend(
  spent: number,
  daysElapsed: number,
  totalDays: number,
  fixedSpent: number = 0,
): number {
  if (daysElapsed <= 0) return 0;
  const fixed = Math.min(Math.max(0, fixedSpent), spent);
  return fixed + dailyAverage(spent - fixed, daysElapsed) * totalDays;
}

/**
 * What an even pace would have spent by today. Drives the progress bar's tick,
 * so the bar answers "am I ahead or behind?" rather than only "how much is gone?".
 */
export function expectedToDate(
  available: number,
  daysElapsed: number,
  totalDays: number,
): number {
  if (totalDays <= 0 || available <= 0) return 0;
  return (available * Math.min(daysElapsed, totalDays)) / totalDays;
}

/**
 * What is left, spread evenly across the days that remain — the "you can spend
 * this much a day" figure. On the last day of the month the remainder is all
 * spendable today, so the divisor floors at 1 rather than dividing by zero.
 */
export function safeDailySpend(remaining: number, daysRemaining: number): number {
  if (remaining <= 0) return 0;
  return remaining / Math.max(1, daysRemaining);
}

/**
 * Classifies a budget against its pace.
 *
 * `over` once spending passes the budget. `at_risk` while still inside it but
 * either the run-rate projects past it, or consumption has passed
 * {@link AT_RISK_CONSUMED_PCT} with days still to fund. Otherwise `on_track`.
 *
 * Projecting rather than only thresholding is the point: 45% consumed on the
 * 6th of the month is a problem, and a flat percentage test cannot see it.
 * Landing exactly on budget is not over (`>`, not `>=`), matching
 * `checkOverBudget`.
 *
 * Fixed costs (`fixedSpent`) are projected once, and the consumption rule looks
 * only at the variable part of the budget — what is still left to fund day by
 * day (VS-40). An envelope that is mostly rent is not "running out" because the
 * rent was paid.
 */
export function budgetHealth(
  spent: number,
  available: number,
  daysElapsed: number,
  totalDays: number,
  fixedSpent: number = 0,
): BudgetHealth {
  if (available <= 0) return 'on_track';
  if (spent > available) return 'over';

  const projected = projectSpend(spent, daysElapsed, totalDays, fixedSpent);
  if (projected > available) return 'at_risk';

  const fixed = Math.min(Math.max(0, fixedSpent), spent);
  const variableBudget = available - fixed;
  const daysLeft = totalDays - daysElapsed;
  if (
    daysLeft > 0 &&
    variableBudget > 0 &&
    consumedPct(spent - fixed, variableBudget) >= AT_RISK_CONSUMED_PCT
  ) {
    return 'at_risk';
  }

  return 'on_track';
}

/** One month's raw envelope facts, as the carry chain consumes them. */
export interface CarryChainEntry {
  month: string;
  allocated: number;
  spent: number;
  rolloverEnabled: boolean;
}

/**
 * Walks a single category's month-by-month history and returns the amount
 * carried **into** each month.
 *
 * ```
 * available(m) = allocated(m) + carriedIn(m) − spent(m)
 * carriedIn(m+1) = rolloverEnabled(m+1) ? available(m) : 0
 * ```
 *
 * Two deliberate choices:
 *
 *  - The carry is gated on the **receiving** month's flag, so the toggle reads
 *    the way it behaves ("this envelope rolls over") and switching it off
 *    cleanly resets the chain instead of stranding an invisible balance.
 *  - Overspend carries too. A negative carry is what makes rollover honest —
 *    an envelope that borrowed from next month should start next month short.
 *
 * Nothing is persisted: recomputing from history means correcting an old month
 * propagates forward instead of leaving a stale stored balance behind.
 *
 * @param history Entries in ascending month order.
 * @returns Month key → amount carried into that month.
 */
export function buildCarryChain(history: ReadonlyArray<CarryChainEntry>): Map<string, number> {
  const carryByMonth = new Map<string, number>();
  let carry = 0;

  for (const entry of history) {
    const carriedIn = entry.rolloverEnabled ? carry : 0;
    carryByMonth.set(entry.month, carriedIn);
    carry = entry.allocated + carriedIn - entry.spent;
  }

  return carryByMonth;
}

/** Everything needed to derive one envelope's display figures. */
export interface CategoryProgressInput {
  categoryId: number;
  categoryName: string;
  allocated: number;
  carriedIn: number;
  spent: number;
  /** The recurring part of `spent`, projected once rather than daily (VS-40). */
  fixedSpent?: number;
  rolloverEnabled: boolean;
}

/**
 * Derives a category envelope's full progress view for `monthISO` as of
 * `todayISO`. Pure: the caller supplies the persisted facts, this adds every
 * figure the UI shows.
 */
export function buildCategoryProgress(
  input: CategoryProgressInput,
  monthISO: string,
  todayISO: string,
): CategoryBudgetProgress {
  const totalDays = daysInMonth(monthISO);
  const elapsed = daysElapsedInMonth(monthISO, todayISO);
  const available = input.allocated + input.carriedIn;

  return {
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    allocated: input.allocated,
    carriedIn: input.carriedIn,
    available,
    spent: input.spent,
    remaining: available - input.spent,
    consumedPct: consumedPct(input.spent, available),
    dailyAverage: dailyAverage(input.spent, elapsed),
    projected: projectSpend(input.spent, elapsed, totalDays, input.fixedSpent),
    expectedToDate: expectedToDate(available, elapsed, totalDays),
    rolloverEnabled: input.rolloverEnabled,
    health: budgetHealth(input.spent, available, elapsed, totalDays, input.fixedSpent),
  };
}

/** The month-level figures shared by the hero card and its stat row. */
export interface OverallProgress {
  spent: number;
  remaining: number;
  consumedPct: number;
  dailyAverage: number;
  projected: number;
  expectedToDate: number;
  safeDailySpend: number;
  daysElapsed: number;
  daysRemaining: number;
  health: BudgetHealth;
}

/**
 * The same derivation as {@link buildCategoryProgress}, applied to the month as
 * a whole. Kept as one function so the hero and the envelopes can never drift
 * into disagreeing about what "at risk" means. `fixedSpent` is the month's
 * recurring spend, projected once (VS-40).
 */
export function buildOverallProgress(
  available: number,
  spent: number,
  monthISO: string,
  todayISO: string,
  fixedSpent: number = 0,
): OverallProgress {
  const totalDays = daysInMonth(monthISO);
  const elapsed = daysElapsedInMonth(monthISO, todayISO);
  const remaining = available - spent;

  return {
    spent,
    remaining,
    consumedPct: consumedPct(spent, available),
    dailyAverage: dailyAverage(spent, elapsed),
    projected: projectSpend(spent, elapsed, totalDays, fixedSpent),
    expectedToDate: expectedToDate(available, elapsed, totalDays),
    safeDailySpend: safeDailySpend(remaining, daysRemainingInMonth(monthISO, todayISO)),
    daysElapsed: elapsed,
    daysRemaining: daysRemainingInMonth(monthISO, todayISO),
    health: budgetHealth(spent, available, elapsed, totalDays, fixedSpent),
  };
}
