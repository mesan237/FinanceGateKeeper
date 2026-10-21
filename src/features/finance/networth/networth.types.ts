/**
 * Net worth on a day (VS-53): money only, by the user's decision — wallets,
 * plus what others still owe the user, minus what the user still owes, plus the
 * tontine position. Things owned (land, livestock, a business) come later.
 */
export interface NetWorth {
  /** Every active wallet's balance at the end of the day. */
  wallets: number;
  /** Still owed to the user on debts they lent. */
  lent: number;
  /** Still owed by the user on debts they took. */
  owed: number;
  /** Tontine contributions paid in, less payouts received. */
  tontines: number;
  /** `wallets + lent − owed + tontines`. */
  total: number;
}

/** A month's money in and out, for the savings rate. */
export interface MonthFlows {
  /** Income received in the month. */
  income: number;
  /** Spending in the month (refunds netted out). */
  spending: number;
}

/** One closed month, as stored at its end (the latest snapshot of that month). */
export interface MonthSnapshot {
  /** `YYYY-MM`. */
  month: string;
  netWorth: number;
  wallets: number;
  lent: number;
  owed: number;
  tontines: number;
  income: number;
  spending: number;
  /** Whole percent of income kept; null without income. */
  savingsRate: number | null;
  /** When the figure was taken (or last recalculated). */
  takenAt: string;
}
