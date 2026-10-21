/** How often a tontine collects: every week or every month. */
export type TontineFrequency = 'weekly' | 'monthly';

/** The cycles a tontine can run on, in the order the form offers them. */
export const TONTINE_FREQUENCIES: ReadonlyArray<TontineFrequency> = ['weekly', 'monthly'];

/**
 * A rotating savings group (VS-51). Each cycle every member pays
 * `contributionAmount`; one member takes the whole pot. There are as many
 * cycles as members, so over a full round the user pays in what they receive.
 */
export interface Tontine {
  id: number;
  name: string;
  contributionAmount: number;
  frequency: TontineFrequency;
  /** `YYYY-MM-DD` of the first contribution. */
  startDate: string;
  /** Members, which is also the number of cycles. */
  members: number;
  /** The cycle in which the user takes the pot; null until the draw settles it. */
  payoutTurn: number | null;
  /** The wallet the user usually pays from and receives into. */
  accountId: number | null;
  createdAt: string;
}

/** Input for `createTontine`. */
export interface NewTontine {
  name: string;
  contributionAmount: number;
  frequency: TontineFrequency;
  startDate: string;
  members: number;
  payoutTurn?: number | null;
  accountId?: number | null;
}

/** Fields an edit may change. */
export type TontinePatch = Partial<NewTontine>;

/** Money the user moved through a tontine: a contribution paid, or the payout received. */
export interface TontinePayment {
  id: number;
  tontineId: number;
  kind: 'contribution' | 'payout';
  cycle: number;
  amount: number;
  accountId: number | null;
  date: string;
}

/**
 * Where one cycle's contribution stands: `paid`, `overdue` (its day passed),
 * `due` (today or within the next few days) or `upcoming`.
 */
export type CycleStatus = 'paid' | 'overdue' | 'due' | 'upcoming';

/** One cycle of the schedule, derived from the start date and the frequency. Never stored. */
export interface TontineCycle {
  cycle: number;
  dueDate: string;
  status: CycleStatus;
  /** The contribution paid for this cycle, if any. */
  payment: TontinePayment | null;
  /** True in the cycle the user takes the pot. */
  isPayoutTurn: boolean;
}

/** Everything the list and the detail say about a tontine. */
export interface TontineSummary {
  /** `contributionAmount × members`: the pot the user takes on their turn. */
  payoutAmount: number;
  /** The payout-turn cycle's date; null while the turn is unknown. */
  payoutDate: string | null;
  /** The payout received, if recorded. */
  payout: TontinePayment | null;
  paidCount: number;
  paidIn: number;
  received: number;
  /** `paidIn − received`: positive means the group owes the user, negative the user owes the group. */
  position: number;
  /** Contributions not yet paid, and what they come to. */
  remainingCount: number;
  remainingAmount: number;
  overdueCount: number;
  /** The earliest unpaid cycle; null when every contribution is paid. */
  nextDue: TontineCycle | null;
  /** Every contribution paid and the payout received. */
  isFinished: boolean;
}

/** A tontine with its summary, as the list shows it. */
export interface TontineWithSummary extends Tontine {
  summary: TontineSummary;
}

/** A tontine with its summary and its whole schedule, as the detail shows it. */
export interface TontineDetail extends TontineWithSummary {
  cycles: TontineCycle[];
}

/** One unpaid contribution, as reminders and committed money need it (VS-52). */
export interface DueContribution {
  tontineId: number;
  tontineName: string;
  cycle: number;
  dueDate: string;
  amount: number;
}
