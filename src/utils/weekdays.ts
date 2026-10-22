import { toISODate } from '@/utils/formatDate';

/** Day of week for a `YYYY-MM-DD` date, 0 = Sunday … 6 = Saturday (UTC-stable). */
function dayOfWeek(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** `iso` moved by `days` calendar days (UTC-stable). */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/**
 * The working day (Monday–Friday) on or after `iso`: a weekday is kept, a
 * Saturday or Sunday becomes the next Monday.
 */
export function firstWeekdayOnOrAfter(iso: string): string {
  const day = dayOfWeek(iso);
  if (day === 6) return addDays(iso, 2);
  if (day === 0) return addDays(iso, 1);
  return iso;
}

/** The working day (Monday–Friday) after `iso`: Friday → Monday. */
export function nextWeekday(iso: string): string {
  return firstWeekdayOnOrAfter(addDays(iso, 1));
}
