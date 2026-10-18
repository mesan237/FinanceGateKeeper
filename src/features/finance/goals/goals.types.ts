/**
 * What a goal is for: a small cushion for surprises, a reserve sized in months
 * of essential spending (VS-50), or a known cost on a date.
 */
export type GoalKind = 'buffer' | 'reserve' | 'sinking';

/** The goal kinds, in the order the form offers them. */
export const GOAL_KINDS: ReadonlyArray<GoalKind> = ['buffer', 'reserve', 'sinking'];

/** The months a reserve may cover, as the form offers them. */
export const RESERVE_MONTHS: ReadonlyArray<number> = [3, 4, 5, 6];

/** A goal as stored. Its money is the balance of the linked wallet (VS-48). */
export interface Goal {
  id: number;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  /** `YYYY-MM-DD`; set for a sinking fund, null otherwise. */
  targetDate: string | null;
  /** Months of essential spending; set for a reserve, null otherwise. */
  targetMonths: number | null;
  accountId: number;
  /** What the user plans to set aside each month. */
  monthlyAmount: number;
  createdAt: string;
}

/** Input for `createGoal`. */
export interface NewGoal {
  name: string;
  kind: GoalKind;
  targetAmount: number;
  targetDate?: string | null;
  /** Required for a reserve, whose target is then computed (`targetAmount` is ignored). */
  targetMonths?: number | null;
  accountId: number;
  monthlyAmount: number;
}

/** Fields an edit may change. */
export type GoalPatch = Partial<NewGoal>;

/** Everything derived from a goal, its wallet balance and today. Never stored. */
export interface GoalProgress {
  /** The wallet balance, floored at zero. */
  saved: number;
  /** `targetAmount - saved`, floored at zero. */
  remaining: number;
  /** Share of the target held, 0–100. */
  pct: number;
  achieved: boolean;
  /** Net transfers into the wallet this month. */
  savedThisMonth: number;
  /** Sinking fund only: months that can still set money aside; 0 once the date passed. */
  monthsLeft: number | null;
  /** Sinking fund only: the monthly amount that reaches the target on time. */
  requiredMonthly: number | null;
  /** Sinking fund only: whether `monthlyAmount` covers `requiredMonthly`. */
  onPace: boolean | null;
  /** Sinking fund only: the date passed with money still missing. */
  isOverdue: boolean;
  /** Buffer only: months to the target at `monthlyAmount`; null without one. */
  monthsToTarget: number | null;
}

/** What one month of essential spending is taken to be, and where that came from. */
export interface EssentialMonthly {
  /** Null when neither complete months nor an estimate say anything. */
  amount: number | null;
  source: 'observed' | 'estimate' | null;
  /** Complete months behind an observed figure; below 3 it is provisional. */
  completeMonths: number;
}

/** What a reserve's target rests on: `targetMonths × essentials`. */
export interface ReserveBasis {
  essentials: number;
  source: 'observed' | 'estimate';
  completeMonths: number;
}

/** A goal with its wallet's name and its progress, as the list shows it. */
export interface GoalWithProgress extends Goal {
  accountName: string;
  progress: GoalProgress;
  /** Reserves only: the essentials figure the live target was sized from. */
  reserveBasis: ReserveBasis | null;
}
