/** What a goal is for: a cushion for surprises, or a known cost on a date. */
export type GoalKind = 'buffer' | 'sinking';

/** The goal kinds, in the order the form offers them. */
export const GOAL_KINDS: ReadonlyArray<GoalKind> = ['buffer', 'sinking'];

/** A goal as stored. Its money is the balance of the linked wallet (VS-48). */
export interface Goal {
  id: number;
  name: string;
  kind: GoalKind;
  targetAmount: number;
  /** `YYYY-MM-DD`; set for a sinking fund, null for a buffer. */
  targetDate: string | null;
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

/** A goal with its wallet's name and its progress, as the list shows it. */
export interface GoalWithProgress extends Goal {
  accountName: string;
  progress: GoalProgress;
}
