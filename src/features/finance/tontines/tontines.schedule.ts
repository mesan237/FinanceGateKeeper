import { daysBetween, toISODate } from '@/utils/formatDate';
import { daysInMonth } from '@/utils/monthMath';

import type {
  CycleStatus,
  Tontine,
  TontineCycle,
  TontineFrequency,
  TontinePayment,
  TontineSummary,
} from './tontines.types';

/** How many days ahead an unpaid contribution counts as due. */
export const DUE_SOON_DAYS = 3;

/**
 * The date of `cycle` (1-based) for a tontine starting on `startDate`. Weekly
 * steps seven days; monthly keeps the start's day of the month, clamped in
 * shorter months but never drifting (31 Jan → 28 Feb → 31 Mar). Pure.
 */
export function cycleDate(startDate: string, frequency: TontineFrequency, cycle: number): string {
  if (frequency === 'weekly') {
    const date = new Date(`${startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 7 * (cycle - 1));
    return toISODate(date);
  }
  const [year, month, day] = startDate.split('-').map(Number);
  const index = year * 12 + (month - 1) + (cycle - 1);
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const monthISO = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
  const clamped = Math.min(day, daysInMonth(monthISO));
  return `${monthISO}-${String(clamped).padStart(2, '0')}`;
}

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
