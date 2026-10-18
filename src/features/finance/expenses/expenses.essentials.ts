import { toISODate } from '@/utils/formatDate';
import { firstDayOfMonth, lastDayOfMonth, prevMonthISO } from '@/utils/monthMath';

import { costTypeResolver, spendKindOf } from './expenses.costType';
import { getLoggedDates, monthCoverage } from './expenses.coverage';
import { getAllCategories, getExpensesByDateRange } from './expenses.service';

/** Observed essential spending: the fixed part of a typical month (VS-50). */
export interface ObservedFixed {
  /** Average fixed spending per complete month; null before any month is complete. */
  average: number | null;
  /** How many complete months the average rests on. */
  completeMonths: number;
}

/**
 * The average fixed spending over the complete months among the `lookback`
 * months before the month of `todayISO` — the same figure as the typical-month
 * profile's "fixed" (VS-41), by the same rule (`spendKindOf`). Every complete
 * month counts, a month without fixed spending as a real zero; an incomplete
 * month is left out rather than guessed at; the current month is never part of
 * it. Sizes the emergency reserve.
 */
export async function getObservedFixedAverage(
  todayISO: string = toISODate(new Date()),
  lookback: number = 3,
): Promise<ObservedFixed> {
  const months: string[] = [];
  let cursor = todayISO.slice(0, 7);
  for (let i = 0; i < lookback; i += 1) {
    cursor = prevMonthISO(cursor);
    months.unshift(cursor);
  }
  const from = firstDayOfMonth(months[0]);
  const to = lastDayOfMonth(months[months.length - 1]);

  const [logged, expenses, categories] = await Promise.all([
    getLoggedDates(from, to),
    getExpensesByDateRange(from, to),
    getAllCategories(),
  ]);
  const complete = new Set(months.filter((m) => monthCoverage(m, logged).isComplete));
  if (complete.size === 0) return { average: null, completeMonths: 0 };

  const kindOf = costTypeResolver(categories);
  const fixed = expenses
    .filter((e) => complete.has(e.date.slice(0, 7)) && spendKindOf(e, kindOf) === 'fixed')
    .reduce((sum, e) => sum + e.amount, 0);
  return { average: Math.round(fixed / complete.size), completeMonths: complete.size };
}
