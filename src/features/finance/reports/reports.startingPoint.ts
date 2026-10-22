import i18n from 'i18next';

import { costTypeResolver } from '@/features/finance/expenses/expenses.costType';
import { getLoggedDates, monthCoverage } from '@/features/finance/expenses/expenses.coverage';
import {
  getAllCategories,
  getExpensesByDateRange,
} from '@/features/finance/expenses/expenses.service';
import { getIncomeByDateRange } from '@/features/finance/income/income.service';
import { query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';
import { firstDayOfMonth, lastDayOfMonth, nextMonthISO, prevMonthISO } from '@/utils/monthMath';

import { buildSpendingProfile } from './reports.profile';
import type { ProfileMonth, StartingPoint } from './reports.types';

/**
 * The starting point (VS-58): what the user's first three complete months cost,
 * before any budgeting changed their habits. Unlike "Your typical month" (the
 * last three months, which moves as habits change), it is fixed once recorded,
 * so "now" can be read against it.
 *
 * A month counts once 80% of its days are logged (`expenses.coverage`), so a
 * half-logged first month is skipped rather than making the user look frugal.
 * The month still running never counts. Nothing is stored: the months are found
 * again on each read, so correcting an old entry corrects the starting point.
 */

/** How many complete months make the starting point. */
export const STARTING_MONTHS = 3;

/** The first {@link STARTING_MONTHS} complete months, oldest first. Pure. */
export function pickStartingMonths(months: ReadonlyArray<ProfileMonth>): ProfileMonth[] {
  return months.filter((m) => m.isComplete).slice(0, STARTING_MONTHS);
}

/** The first day anything was logged (an expense or a no-spend day), or null. */
async function getFirstLoggedDate(): Promise<string | null> {
  const [row] = await query<{ first: string | null }>(
    'SELECT MIN(date) AS first FROM (SELECT date FROM expenses UNION SELECT date FROM zero_days)',
  );
  return row?.first ?? null;
}

/**
 * Finds the starting point from the first logged day up to the last closed
 * month before `todayISO`, and builds its profile once all three months exist.
 */
export async function getStartingPoint(todayISO: string = toISODate(new Date())): Promise<StartingPoint> {
  const none: StartingPoint = { recorded: [], needed: STARTING_MONTHS, profile: null };
  const first = await getFirstLoggedDate();
  const lastClosed = prevMonthISO(todayISO.slice(0, 7));
  if (first === null || first.slice(0, 7) > lastClosed) return none;

  const window: string[] = [];
  for (let m = first.slice(0, 7); m <= lastClosed; m = nextMonthISO(m)) window.push(m);
  const logged = await getLoggedDates(firstDayOfMonth(window[0]), lastDayOfMonth(lastClosed));
  const picked = pickStartingMonths(
    window.map((month) => {
      const { coverage, isComplete } = monthCoverage(month, logged);
      return { month, coverage, isComplete };
    }),
  );

  const recorded = picked.map((m) => m.month);
  if (picked.length < STARTING_MONTHS) return { ...none, recorded };

  const from = firstDayOfMonth(recorded[0]);
  const to = lastDayOfMonth(recorded[recorded.length - 1]);
  const [expenses, categories, incomes] = await Promise.all([
    getExpensesByDateRange(from, to),
    getAllCategories(),
    getIncomeByDateRange(from, to),
  ]);
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));

  return {
    recorded,
    needed: STARTING_MONTHS,
    // Only the picked months count: a skipped month in between is filtered out.
    profile: buildSpendingProfile({
      months: picked,
      expenses,
      incomes,
      kindOf: costTypeResolver(categories),
      labelOf: (id) => nameOf.get(id) ?? i18n.t('uncategorised', { ns: 'reports' }),
    }),
  };
}
