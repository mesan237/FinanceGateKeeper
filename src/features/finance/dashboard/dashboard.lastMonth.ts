import { costTypeResolver, spendKindOf } from '@/features/finance/expenses/expenses.costType';
import * as expensesService from '@/features/finance/expenses/expenses.service';
import type { Expense } from '@/features/finance/expenses/expenses.types';
import { percentChange } from '@/utils/percentChange';
import { daysInMonth, prevMonthISO } from '@/utils/monthMath';

import type { EverydayVsLastMonth } from './dashboard.types';

/** Before this day of the month, a day or two of spending says nothing about the month. */
export const MIN_DAY_TO_COMPARE = 3;

/**
 * Everyday spending now against the same point last month (VS-95), or null
 * when last month had none by then: a percentage against nothing means
 * nothing. Pure.
 */
export function compareEveryday(
  current: number,
  previous: number,
): Omit<EverydayVsLastMonth, 'lastMonthDate'> | null {
  const change = percentChange(current, previous);
  if (change === null) return null;
  return { current, previous, change };
}

/**
 * Home's "everyday spending vs the same day last month" (VS-95): this month
 * from the 1st to today, against last month from the 1st to the same day (its
 * last day when it is shorter). Only everyday spending counts, by the app's one
 * rule (`spendKindOf`): fixed categories, auto-logged bills and imprévus are
 * left out, so rent paid on a different day cannot make it jump. Refunds count
 * against what they give back. Null before the 3rd, and when last month had no
 * everyday spending by then.
 */
export async function getEverydayVsLastMonth(
  monthISO: string,
  todayISO: string,
): Promise<EverydayVsLastMonth | null> {
  const day = Number(todayISO.slice(8, 10));
  if (day < MIN_DAY_TO_COMPARE) return null;

  const lastMonth = prevMonthISO(monthISO);
  const lastDay = Math.min(day, daysInMonth(lastMonth));
  const lastMonthDate = `${lastMonth}-${String(lastDay).padStart(2, '0')}`;

  const [now, then, categories] = await Promise.all([
    expensesService.getExpensesByDateRange(`${monthISO}-01`, todayISO),
    expensesService.getExpensesByDateRange(`${lastMonth}-01`, lastMonthDate),
    expensesService.getAllCategories(),
  ]);
  const kindOf = costTypeResolver(categories);
  const everyday = (expenses: Expense[]) =>
    expenses.reduce((sum, e) => (spendKindOf(e, kindOf) === 'variable' ? sum + e.amount : sum), 0);

  const compared = compareEveryday(everyday(now), everyday(then));
  return compared ? { ...compared, lastMonthDate } : null;
}
