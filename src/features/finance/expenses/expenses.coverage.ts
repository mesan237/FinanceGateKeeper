import { query } from '@/services/database';
import { daysInMonth, firstDayOfMonth, lastDayOfMonth } from '@/utils/monthMath';

/**
 * Logging coverage (VS-41): how much of a month the user actually accounted
 * for. A day counts when it holds at least one expense or a confirmed
 * zero-spend day — the only two signals that separate "spent nothing" from
 * "forgot to log".
 *
 * Averages are only honest over complete months. A user who started on the
 * 16th, or skipped two weeks, would otherwise look frugal.
 */

/** Share of a month's days that must be accounted for before the month counts. */
export const COMPLETE_MONTH_COVERAGE = 0.8;

/** How well one month is accounted for. */
export interface MonthCoverage {
  /** `YYYY-MM`. */
  month: string;
  loggedDays: number;
  daysInMonth: number;
  /** `loggedDays / daysInMonth`, 0–1. */
  coverage: number;
  /** True once coverage reaches {@link COMPLETE_MONTH_COVERAGE}. */
  isComplete: boolean;
}

/**
 * Derives a month's coverage from the set of accounted-for dates. Dates outside
 * the month are ignored. Pure.
 */
export function monthCoverage(monthISO: string, loggedDates: ReadonlySet<string>): MonthCoverage {
  const total = daysInMonth(monthISO);
  let logged = 0;
  for (const date of loggedDates) {
    if (date.startsWith(`${monthISO}-`)) logged += 1;
  }
  const coverage = total > 0 ? logged / total : 0;
  return {
    month: monthISO,
    loggedDays: logged,
    daysInMonth: total,
    coverage,
    isComplete: coverage >= COMPLETE_MONTH_COVERAGE,
  };
}

/** Returns the distinct dates in `[from, to]` that hold an expense or a zero-day confirmation. */
export async function getLoggedDates(from: string, to: string): Promise<Set<string>> {
  const rows = await query<{ date: string }>(
    `SELECT date FROM expenses WHERE date >= ? AND date <= ?
     UNION
     SELECT date FROM zero_days WHERE date >= ? AND date <= ?`,
    [from, to, from, to],
  );
  return new Set(rows.map((r) => r.date));
}

/** Reads one month's logging coverage from the database. */
export async function getMonthCoverage(monthISO: string): Promise<MonthCoverage> {
  const dates = await getLoggedDates(firstDayOfMonth(monthISO), lastDayOfMonth(monthISO));
  return monthCoverage(monthISO, dates);
}
