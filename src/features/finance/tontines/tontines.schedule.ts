import { cycleDate } from '@/utils/cycleDate';
import { daysBetween } from '@/utils/formatDate';

import type {
  CycleStatus,
  Tontine,
  TontineCycle,
  TontinePayment,
  TontineSummary,
} from './tontines.types';

/** How many days ahead an unpaid contribution counts as due. */
export const DUE_SOON_DAYS = 3;

export { cycleDate } from '@/utils/cycleDate';

/** An unpaid cycle's status against today. */
function unpaidStatus(dueDate: string, todayISO: string): CycleStatus {
  const days = daysBetween(todayISO, dueDate);
  if (days < 0) return 'overdue';
  return days <= DUE_SOON_DAYS ? 'due' : 'upcoming';
}

/**
 * The tontine's whole schedule: one cycle per member, each with its date, the
 * contribution paid for it (if any) and its status. Pure.
 */
export function buildCycles(
  tontine: Tontine,
  payments: ReadonlyArray<TontinePayment>,
  todayISO: string,
): TontineCycle[] {
  const paidByCycle = new Map(
    payments.filter((p) => p.kind === 'contribution').map((p) => [p.cycle, p]),
  );
  return Array.from({ length: tontine.members }, (_, i) => {
    const cycle = i + 1;
    const dueDate = cycleDate(tontine.startDate, tontine.frequency, cycle);
    const payment = paidByCycle.get(cycle) ?? null;
    return {
      cycle,
      dueDate,
      status: payment ? 'paid' : unpaidStatus(dueDate, todayISO),
      payment,
      isPayoutTurn: tontine.payoutTurn === cycle,
    };
  });
}

/**
 * The figures the screens show for a tontine (VS-51): the pot and when it
 * comes, what has been paid in and received, the position between the two,
 * what is still to pay and what is overdue. Pure.
 */
export function summarise(
  tontine: Tontine,
  cycles: ReadonlyArray<TontineCycle>,
  payments: ReadonlyArray<TontinePayment>,
): TontineSummary {
  const paid = cycles.filter((c) => c.payment !== null);
  const paidIn = paid.reduce((sum, c) => sum + (c.payment?.amount ?? 0), 0);
  const payout = payments.find((p) => p.kind === 'payout') ?? null;
  const received = payout?.amount ?? 0;
  const unpaid = cycles.filter((c) => c.payment === null);
  const turn = tontine.payoutTurn === null ? null : cycles[tontine.payoutTurn - 1] ?? null;

  return {
    payoutAmount: tontine.contributionAmount * tontine.members,
    payoutDate: turn?.dueDate ?? null,
    payout,
    paidCount: paid.length,
    paidIn,
    received,
    position: paidIn - received,
    remainingCount: unpaid.length,
    remainingAmount: unpaid.length * tontine.contributionAmount,
    overdueCount: unpaid.filter((c) => c.status === 'overdue').length,
    nextDue: unpaid[0] ?? null,
    isFinished: unpaid.length === 0 && payout !== null,
  };
}
