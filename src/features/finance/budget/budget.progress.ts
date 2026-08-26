import {
  daysElapsedInMonth,
  daysInMonth,
  daysRemainingInMonth,
  weekIndexOfDate,
  weeksInMonth,
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
 */
export function projectSpend(spent: number, daysElapsed: number, totalDays: number): number {
  if (daysElapsed <= 0) return 0;
  return dailyAverage(spent, daysElapsed) * totalDays;
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
 */
export function budgetHealth(
  spent: number,
  available: number,
  daysElapsed: number,
  totalDays: number,
): BudgetHealth {
  if (available <= 0) return 'on_track';
  if (spent > available) return 'over';

  const projected = projectSpend(spent, daysElapsed, totalDays);
  if (projected > available) return 'at_risk';

  const daysLeft = totalDays - daysElapsed;
  if (daysLeft > 0 && consumedPct(spent, available) >= AT_RISK_CONSUMED_PCT) return 'at_risk';

  return 'on_track';
}

/**
 * Buckets a month's expenses into 7-day slots, oldest first, for the weekly
 * trend bars. Days 1–7 form week 1, 8–14 week 2, and so on — so a bar lines up
 * with "the first week of the month" as a person reads a budget, not with ISO
 * week numbering (which would split week 1 across two months).
 *
 * @param expenses Any rows carrying a `YYYY-MM-DD` date and an amount.
 * @param monthISO The month to bucket; dates outside it are ignored.
 */
export function buildWeeklyTrend(
  expenses: ReadonlyArray<{ date: string; amount: number }>,
  monthISO: string,
): number[] {
  const buckets = new Array<number>(weeksInMonth(monthISO)).fill(0);
  for (const expense of expenses) {
    if (!expense.date.startsWith(monthISO)) continue;
    const index = weekIndexOfDate(expense.date);
    if (index < buckets.length) buckets[index] += expense.amount;
  }
  return buckets;
}

/**
 * The ideal-versus-actual burn-down of remaining budget, one point per elapsed
 * day (plus day 0 at the full budget).
 *
 * `ideal` falls in a straight line to zero across the whole month; `actual`
 * follows real spending and stops at today. The gap between the two lines is
 * the single clearest read of "am I ahead or behind", which no percentage can
 * convey on its own.
 *
 * @returns Points for days 0…elapsed. `actual` may go negative once overspent.
 */
export function buildBurndown(
  expenses: ReadonlyArray<{ date: string; amount: number }>,
  available: number,
  monthISO: string,
  todayISO: string,
): { day: number; ideal: number; actual: number }[] {
  const totalDays = daysInMonth(monthISO);
  const elapsed = daysElapsedInMonth(monthISO, todayISO);

  const spentOnDay = new Array<number>(totalDays + 1).fill(0);
  for (const expense of expenses) {
    if (!expense.date.startsWith(monthISO)) continue;
    const day = Number(expense.date.slice(8, 10));
    if (day >= 1 && day <= totalDays) spentOnDay[day] += expense.amount;
  }

  const points: { day: number; ideal: number; actual: number }[] = [];
  let cumulative = 0;
  for (let day = 0; day <= elapsed; day += 1) {
    cumulative += spentOnDay[day] ?? 0;
    points.push({
      day,
      ideal: available - (available * day) / totalDays,
      actual: available - cumulative,
    });
  }
  return points;
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
    projected: projectSpend(input.spent, elapsed, totalDays),
    expectedToDate: expectedToDate(available, elapsed, totalDays),
    rolloverEnabled: input.rolloverEnabled,
    health: budgetHealth(input.spent, available, elapsed, totalDays),
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
 * into disagreeing about what "at risk" means.
 */
export function buildOverallProgress(
  available: number,
  spent: number,
  monthISO: string,
  todayISO: string,
): OverallProgress {
  const totalDays = daysInMonth(monthISO);
  const elapsed = daysElapsedInMonth(monthISO, todayISO);
  const remaining = available - spent;

  return {
    spent,
    remaining,
    consumedPct: consumedPct(spent, available),
    dailyAverage: dailyAverage(spent, elapsed),
    projected: projectSpend(spent, elapsed, totalDays),
    expectedToDate: expectedToDate(available, elapsed, totalDays),
    safeDailySpend: safeDailySpend(remaining, daysRemainingInMonth(monthISO, todayISO)),
    daysElapsed: elapsed,
    daysRemaining: daysRemainingInMonth(monthISO, todayISO),
    health: budgetHealth(spent, available, elapsed, totalDays),
  };
}
