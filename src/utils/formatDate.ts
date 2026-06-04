const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Coerces a `Date` or an ISO date string into a `Date`. Bare `YYYY-MM-DD`
 * strings are anchored to UTC midnight so display never drifts by a day
 * across timezones.
 */
function asDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  // A date-only string is parsed as UTC by appending an explicit time+zone.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(dateOnly ? `${value}T00:00:00Z` : value);
}

/**
 * Returns the current month as `YYYY-MM`, in UTC. Used by every budget
 * lookup to key allocations and totals — UTC keeps the month boundary stable
 * across timezones.
 */
export function currentMonthISO(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats a date as a UTC-stable `YYYY-MM-DD` string for storage in SQLite.
 *
 * @param d The date to format.
 * @returns e.g. `new Date('2026-06-12T15:00:00Z')` -> "2026-06-12".
 */
export function toISODate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date as a short, day-and-month label for transaction rows.
 *
 * @param d A `Date` or `YYYY-MM-DD` string.
 * @returns e.g. "12 Jun".
 */
export function formatDateShort(d: Date | string): string {
  const date = asDate(d);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
}

/**
 * Formats a date as a full day-month-year label.
 *
 * @param d A `Date` or `YYYY-MM-DD` string.
 * @returns e.g. "12 June 2026".
 */
export function formatDateLong(d: Date | string): string {
  const date = asDate(d);
  return `${date.getUTCDate()} ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
