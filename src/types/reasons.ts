/**
 * Why money was spent (VS-62): the reason behind an expense, shared by the
 * Budget category detail and Reports so both read spending the same way.
 *
 * - `routine`: fixed costs — recurring bills (weekdays included) and categories
 *   tagged fixed.
 * - `event`: tagged with an occasion (a wedding, a funeral, a trip).
 * - `unexpected`: marked as an imprévu.
 * - `everyday`: the rest — the habits the user can change.
 */
export type SpendReason = 'routine' | 'event' | 'unexpected' | 'everyday';

/** The display order of the reasons, most planned first. */
export const SPEND_REASONS: ReadonlyArray<SpendReason> = ['routine', 'event', 'unexpected', 'everyday'];

/** Net spending per reason, whole FCFA, never below zero. */
export type ReasonTotals = Record<SpendReason, number>;

/** One event's part of a total, for listing under "Events". */
export interface ReasonEvent {
  eventId: number;
  name: string;
  amount: number;
}
