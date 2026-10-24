import i18n from 'i18next';

import {
  getFirstLoggedDate,
  getLoggedDates,
  missedDays,
  monthLoggingStatus,
} from '@/features/finance/expenses/expenses.coverage';
import { confirmZeroDay } from '@/features/finance/expenses/expenses.service';
import { isoDaysBefore, toISODate } from '@/utils/formatDate';

import type { ObserveLogging } from './journey.types';

/** How many days back, before today, a forgotten day can still be marked as no-spend (D5). */
export const MISSED_DAYS_WINDOW = 7;

/** The first and last day a missed day may be marked on, as of `todayISO`. */
function windowOf(todayISO: string): { from: string; to: string } {
  return { from: isoDaysBefore(todayISO, MISSED_DAYS_WINDOW), to: isoDaysBefore(todayISO, 1) };
}

/**
 * The Observe step's short-term feedback (UX-05–07): how much of the running
 * month is logged against the complete-month rule, whether it can still count,
 * the recent days with nothing logged (UX-06), and — when the user's very first
 * month began too late to count — the day it began (UX-07).
 *
 * Missed days never reach back before the first day the user logged anything:
 * marking days from before they used the app as "spent nothing" would invent
 * history. The same "logged day" as complete months (`expenses.coverage`).
 */
export async function getObserveLogging(todayISO: string = toISODate(new Date())): Promise<ObserveLogging> {
  const month = todayISO.slice(0, 7);
  const window = windowOf(todayISO);
  const monthStart = `${month}-01`;
  const [logged, first] = await Promise.all([
    getLoggedDates(window.from < monthStart ? window.from : monthStart, todayISO),
    getFirstLoggedDate(),
  ]);

  const missed =
    first === null ? [] : missedDays(first > window.from ? first : window.from, window.to, logged);
  const recoverable = missed.filter((date) => date.startsWith(month)).length;
  const status = monthLoggingStatus(month, todayISO, logged, recoverable);
  const firstMonth = first !== null && first.startsWith(month);

  return {
    ...status,
    missedDays: missed,
    startedOn: firstMonth && !status.canStillCount ? Number(first.slice(8, 10)) : null,
  };
}

/**
 * Marks a recent day with nothing logged as a no-spend day (UX-06).
 *
 * @throws when `dateISO` is outside the last {@link MISSED_DAYS_WINDOW} days
 *   before today, or already holds spending (`confirmZeroDay`'s guard).
 */
export async function markNoSpendDay(dateISO: string, todayISO: string = toISODate(new Date())): Promise<void> {
  const window = windowOf(todayISO);
  if (dateISO < window.from || dateISO > window.to) {
    throw new Error(i18n.t('errors.outsideWindow', { ns: 'journey', days: MISSED_DAYS_WINDOW }));
  }
  await confirmZeroDay(dateISO);
}
