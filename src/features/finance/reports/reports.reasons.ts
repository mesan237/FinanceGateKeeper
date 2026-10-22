import { costTypeResolver } from '@/features/finance/expenses/expenses.costType';
import { groupByEvent, sumByReason } from '@/features/finance/expenses/expenses.reason';
import type { Category, Expense } from '@/features/finance/expenses/expenses.types';
import { getEventNames } from '@/services/transactions';

import type { MonthReasons } from './reports.types';

/**
 * Why the month's money went (VS-62): routine, events, unexpected and everyday
 * spending across every category, and the events behind the "Events" share —
 * the same rule (`expenses.reason`) the Budget category detail uses.
 */
export async function summariseReasons(
  expenses: ReadonlyArray<Expense>,
  categories: ReadonlyArray<Category>,
): Promise<MonthReasons> {
  const names = await getEventNames(expenses.flatMap((e) => (e.eventId === null ? [] : [e.eventId])));
  return {
    totals: sumByReason(expenses, costTypeResolver(categories)),
    events: groupByEvent(expenses, names),
  };
}
