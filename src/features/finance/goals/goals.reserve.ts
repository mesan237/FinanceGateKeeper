import { getObservedFixedAverage } from '@/features/finance/expenses/expenses.essentials';
import { query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import type { EssentialMonthly, ReserveBasis } from './goals.types';

/**
 * Sizing the emergency reserve (VS-50): the user picks months, the app
 * multiplies by one month of essential spending. What the complete months show
 * wins over the user's estimate, so the target follows reality as it is logged;
 * below three complete months it is provisional.
 */

/**
 * The latest monthly-essentials estimate (VS-46), offered as a starter-buffer
 * target and used for a reserve until a month is complete. Read from
 * `baseline_facts` by SQL so `goals` does not import `budget`.
 */
export async function getEssentialsEstimate(): Promise<number | null> {
  const rows = await query<{ value: number }>(
    `SELECT value FROM baseline_facts WHERE kind = 'monthly_essentials'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  );
  const value = rows[0]?.value ?? 0;
  return value > 0 ? value : null;
}

/**
 * One month of essential spending: the observed fixed average over complete
 * months (`expenses.getObservedFixedAverage`) when there is one, otherwise the
 * estimate, otherwise unknown.
 */
export async function getEssentialMonthly(todayISO: string = toISODate(new Date())): Promise<EssentialMonthly> {
  const [observed, estimate] = await Promise.all([getObservedFixedAverage(todayISO), getEssentialsEstimate()]);
  if (observed.average !== null && observed.average > 0) {
    return { amount: observed.average, source: 'observed', completeMonths: observed.completeMonths };
  }
  if (estimate !== null) return { amount: estimate, source: 'estimate', completeMonths: observed.completeMonths };
  return { amount: null, source: null, completeMonths: observed.completeMonths };
}

/** The basis a reserve is sized from, or null when essentials are unknown. */
export function reserveBasis(essentials: EssentialMonthly): ReserveBasis | null {
  if (essentials.amount === null || essentials.source === null) return null;
  return { essentials: essentials.amount, source: essentials.source, completeMonths: essentials.completeMonths };
}
