import { toISODate } from '@/utils/formatDate';
import { daysInMonth } from '@/utils/monthMath';

/** How often a repeating schedule falls due. */
export type CycleFrequency = 'weekly' | 'monthly';

/**
 * The date of occurrence `n` (1-based) of a schedule starting on `startDate`.
 * Weekly steps seven days; monthly keeps the start's day of the month, clamped
 * in shorter months but never drifting (31 Jan → 28 Feb → 31 Mar). Pure.
 *
 * Shared by tontine cycles (VS-51) and debt instalments (VS-54), and by
 * `budget` for committed money, so no feature imports another for it.
 */
export function cycleDate(startDate: string, frequency: CycleFrequency, n: number): string {
  if (frequency === 'weekly') {
    const date = new Date(`${startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 7 * (n - 1));
    return toISODate(date);
  }
  const [year, month, day] = startDate.split('-').map(Number);
  const index = year * 12 + (month - 1) + (n - 1);
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const monthISO = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
  const clamped = Math.min(day, daysInMonth(monthISO));
  return `${monthISO}-${String(clamped).padStart(2, '0')}`;
}
