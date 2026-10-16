import {
  daysElapsedInMonth,
  daysInMonth,
  weekIndexOfDate,
  weeksInMonth,
} from '@/utils/monthMath';

/**
 * The Budget tab's chart series — weekly spend buckets and the burn-down. Pure
 * arithmetic over dated expense rows; split out of `budget.progress.ts` to keep
 * that module under the 300-line ceiling (VS-40).
 */

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
