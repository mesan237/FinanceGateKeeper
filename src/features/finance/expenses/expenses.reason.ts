import type { ReasonEvent, ReasonTotals, SpendReason } from '@/types/reasons';

import { spendKindOf, type SpendFacts } from './expenses.costType';
import type { CostType } from './expenses.types';

/** The facts that decide why an expense happened. */
export interface ReasonFacts extends SpendFacts {
  eventId: number | null;
}

/**
 * Why an expense happened (VS-62). The occasion the user tagged comes first —
 * it is the most specific answer — then a surprise, then fixed costs (recurring
 * bills and fixed categories, by `spendKindOf`), then everyday spending. Pure.
 */
export function reasonOf(
  expense: ReasonFacts,
  kindOf: (categoryId: number, subcategoryId: number | null) => CostType,
): SpendReason {
  if (expense.eventId !== null) return 'event';
  const kind = spendKindOf(expense, kindOf);
  if (kind === 'unexpected') return 'unexpected';
  return kind === 'fixed' ? 'routine' : 'everyday';
}

/**
 * Adds expenses up by reason. Refund rows (negative amounts) carry their
 * purchase's facts, so they net out of the right reason; a reason never shows
 * below zero. Pure.
 */
export function sumByReason(
  expenses: ReadonlyArray<ReasonFacts & { amount: number }>,
  kindOf: (categoryId: number, subcategoryId: number | null) => CostType,
): ReasonTotals {
  const totals: ReasonTotals = { routine: 0, event: 0, unexpected: 0, everyday: 0 };
  for (const e of expenses) totals[reasonOf(e, kindOf)] += e.amount;
  for (const reason of Object.keys(totals) as SpendReason[]) totals[reason] = Math.max(0, totals[reason]);
  return totals;
}

/**
 * The events behind the "Events" reason: each event's net spend across these
 * expenses and how many expenses carry it (refunds not counted), largest
 * first; an event netted to zero or less is left out. Pure.
 *
 * @param names Event names by id (`services/transactions.getEventNames`).
 */
export function groupByEvent(
  expenses: ReadonlyArray<{ eventId: number | null; amount: number }>,
  names: ReadonlyMap<number, string>,
): ReasonEvent[] {
  const byEvent = new Map<number, { amount: number; count: number }>();
  for (const e of expenses) {
    if (e.eventId === null) continue;
    const sum = byEvent.get(e.eventId) ?? { amount: 0, count: 0 };
    byEvent.set(e.eventId, { amount: sum.amount + e.amount, count: sum.count + (e.amount > 0 ? 1 : 0) });
  }
  return [...byEvent.entries()]
    .filter(([, sum]) => sum.amount > 0)
    .map(([eventId, sum]) => ({ eventId, name: names.get(eventId) ?? '', amount: sum.amount, count: sum.count }))
    .sort((a, b) => b.amount - a.amount);
}
