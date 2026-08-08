/**
 * Calendar math over `YYYY-MM` month keys, in UTC.
 *
 * Budgeting needs to know where in a month "today" sits — how much of the month
 * has burned, how much is left, which week a date falls in. That arithmetic was
 * previously stranded inside `dashboard.service`, which the `budget` slice may
 * not import. It is pure date math over `constants`-free primitives, so its
 * home is `utils/`; `dashboard.service` and `reports.service` now delegate here.
 *
 * Every function is pure and UTC-anchored — the same reasoning as
 * `formatDate.ts`: a month boundary must not shift with the device timezone.
 */

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

/** Days grouped into one trend bucket. Buckets are day-of-month based, not ISO weeks. */
const DAYS_PER_WEEK = 7;

/** Splits a `YYYY-MM` key into its numeric year and 1-indexed month. */
function parseMonth(monthISO: string): { year: number; month: number } {
  const [year, month] = monthISO.split('-').map(Number);
  return { year, month };
}

/** The `YYYY-MM` key a `YYYY-MM-DD` date belongs to. */
function monthOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/**
 * Number of calendar days in `monthISO`.
 *
 * @param monthISO A `YYYY-MM` month key.
 * @returns e.g. `daysInMonth('2024-02')` -> 29.
 */
export function daysInMonth(monthISO: string): number {
  const { year, month } = parseMonth(monthISO);
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The first calendar day of `monthISO` as `YYYY-MM-DD`. */
export function firstDayOfMonth(monthISO: string): string {
  return `${monthISO}-01`;
}

/** The last calendar day of `monthISO` as `YYYY-MM-DD`. */
export function lastDayOfMonth(monthISO: string): string {
  return `${monthISO}-${String(daysInMonth(monthISO)).padStart(2, '0')}`;
}

/**
 * How many days of `monthISO` have been lived through as of `todayISO`,
 * counting today itself (so the 1st returns 1, not 0 — a budget has been
 * spendable for one day by then, and a zero would make every pace figure
 * divide by zero).
 *
 * A month already in the past returns its full length; a month that has not
 * begun returns 0. That is what lets the same progress/projection math serve
 * the month stepper's historical and future views without special-casing.
 */
export function daysElapsedInMonth(monthISO: string, todayISO: string): number {
  const todayMonth = monthOf(todayISO);
  if (todayMonth < monthISO) return 0;
  if (todayMonth > monthISO) return daysInMonth(monthISO);
  return Number(todayISO.slice(8, 10));
}

/**
 * Whole days left in `monthISO` after `todayISO`. The last day of the month
 * gives 0. Complement of {@link daysElapsedInMonth}.
 */
export function daysRemainingInMonth(monthISO: string, todayISO: string): number {
  return daysInMonth(monthISO) - daysElapsedInMonth(monthISO, todayISO);
}

/**
 * The elapsed share of `monthISO` as of `todayISO`, in `[0, 1]`. This is the
 * multiplier behind every "you should have spent X by now" figure.
 */
export function monthProgress(monthISO: string, todayISO: string): number {
  return daysElapsedInMonth(monthISO, todayISO) / daysInMonth(monthISO);
}

/** The `YYYY-MM` key of the month before `monthISO`. */
export function prevMonthISO(monthISO: string): string {
  const { year, month } = parseMonth(monthISO);
  const d = new Date(Date.UTC(year, month - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The `YYYY-MM` key of the month after `monthISO`. */
export function nextMonthISO(monthISO: string): string {
  const { year, month } = parseMonth(monthISO);
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * A month key as a human label for headers and steppers.
 *
 * @returns e.g. `monthLabel('2026-08')` -> "August 2026".
 */
export function monthLabel(monthISO: string): string {
  const { year, month } = parseMonth(monthISO);
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

/**
 * Which 7-day bucket of its month a `YYYY-MM-DD` date falls in, 0-indexed.
 * Buckets run 1–7, 8–14, … so they line up with "the first week of the month"
 * as a person reads a budget, not with ISO week numbering (which would split
 * the first bucket across two months).
 */
export function weekIndexOfDate(dateISO: string): number {
  return Math.floor((Number(dateISO.slice(8, 10)) - 1) / DAYS_PER_WEEK);
}

/** How many 7-day buckets `monthISO` spans — 4 for February, 5 for most months. */
export function weeksInMonth(monthISO: string): number {
  return Math.ceil(daysInMonth(monthISO) / DAYS_PER_WEEK);
}
