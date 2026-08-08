import type { Bucket } from '@/constants/allocation';

// Re-exported so this slice's types have their documented home here, while the
// enum's single source of truth stays in `@/constants/allocation` (mirrors the
// `IncomeSource` pattern from VS-05).
export type { Bucket };

/** A persisted allocation row — one per `YYYY-MM` month. */
export interface Allocation {
  id: number;
  month: string;
  emergencyFundPct: number;
  savingsPct: number;
  projectsPct: number;
  expensesPct: number;
  priorityOrder: Bucket[];
  isLocked: boolean;
  createdAt: string;
}

/** What the settings screen edits — id, createdAt, and isLocked are server-managed. */
export type AllocationDraft = Omit<Allocation, 'id' | 'createdAt' | 'isLocked'>;

/**
 * Where a held (pending) income amount is sent when the user allocates it from
 * the unallocated pool (VS-19). `expense` adds nothing extra — flipping the
 * income to `allocated` is what lets it count toward the expense budget.
 */
export type AllocationDestination =
  | { kind: 'expense' }
  | { kind: 'fund'; fundType: 'emergency' | 'savings' }
  | { kind: 'project'; projectId: number };

/** Result of splitting an income amount across the four buckets. Whole FCFA only. */
export interface AllocationBreakdown {
  emergencyFund: number;
  savings: number;
  projects: number;
  expenses: number;
}

/** Composed monthly view: income, allocation, breakdown, and expense progress. */
export interface MonthlyBudget {
  month: string;
  incomeTotal: number;
  allocation: Allocation;
  breakdown: AllocationBreakdown;
  expensesLogged: number;
  expensesRemaining: number;
}

/**
 * Result of a pre-save over-budget check for one prospective expense.
 * `overage` is 0 when not over; `remaining` is the expense budget left before
 * the prospective expense; `expenseBudget` is the month's allocated expense
 * bucket. `isOver` is only ever true once the month's allocation is locked.
 */
export interface OverBudgetCheck {
  isOver: boolean;
  overage: number;
  remaining: number;
  expenseBudget: number;
}

/**
 * Same shape as {@link OverBudgetCheck}, for one category envelope. Unlike the
 * month-wide check this is **not** gated on the allocation lock: a category
 * budget is a deliberate number the user typed, so it is meaningful the moment
 * it exists. `categoryName` carries the label so the alert can name the
 * envelope rather than say "your budget".
 */
export interface CategoryBudgetCheck extends OverBudgetCheck {
  categoryId: number;
  categoryName: string;
  /** False when the category has no envelope this month — nothing to exceed. */
  hasBudget: boolean;
}

/**
 * How a budget is tracking against its pace, not merely against its total.
 *
 * - `over`     — already past the budget.
 * - `at_risk`  — still inside it, but the current run-rate does not end there.
 * - `on_track` — spending at or under the pace the month can absorb.
 */
export type BudgetHealth = 'on_track' | 'at_risk' | 'over';

/** One category envelope for a month, with everything derived for display. */
export interface CategoryBudgetProgress {
  categoryId: number;
  categoryName: string;
  /** What the user assigned this month (excludes any rollover). */
  allocated: number;
  /** Carried in from previous months; 0 unless rollover is enabled. */
  carriedIn: number;
  /** `allocated + carriedIn` — the envelope's real spending power. */
  available: number;
  spent: number;
  /** `available - spent`; negative once overspent. */
  remaining: number;
  /** Share of `available` consumed. Uncapped, so an overage stays visible. */
  consumedPct: number;
  /** `spent / days elapsed` — the run-rate driving the projection. */
  dailyAverage: number;
  /** Run-rate extended to the end of the month. */
  projected: number;
  /** What an even pace would have spent by today — the progress bar's tick. */
  expectedToDate: number;
  rolloverEnabled: boolean;
  health: BudgetHealth;
}

/**
 * The month's distribution: how big the pot is and how much of it has been
 * handed out to envelopes. `unassigned` going to zero is the planner's
 * finish line; a negative value means the envelopes promise more than exists.
 */
export interface MonthlyPlan {
  month: string;
  /** Explicit `total_budget` when set, otherwise the derived expenses bucket. */
  totalBudget: number;
  /** True when the user set the total by hand rather than inheriting the split. */
  isExplicit: boolean;
  /** The derived figure, always available so the UI can offer it as a suggestion. */
  derivedTotal: number;
  /** Sum of category allocations (never includes rollover). */
  assigned: number;
  /** `totalBudget - assigned`; negative when over-allocated. */
  unassigned: number;
  isOverAllocated: boolean;
}

/**
 * The whole Budget tab in one shape: the plan, every envelope, and the same
 * insight set as a category but computed across the month.
 */
export interface BudgetOverview {
  month: string;
  plan: MonthlyPlan;
  categories: CategoryBudgetProgress[];
  /** Total carried into this month across rollover-enabled envelopes. */
  totalCarried: number;
  /** `plan.totalBudget + totalCarried` — everything spendable this month. */
  available: number;
  spent: number;
  remaining: number;
  consumedPct: number;
  dailyAverage: number;
  projected: number;
  expectedToDate: number;
  /** What is left, spread evenly over the days that remain. */
  safeDailySpend: number;
  daysElapsed: number;
  daysRemaining: number;
  health: BudgetHealth;
  /** True when neither a total nor any envelope has been set for the month. */
  isUnplanned: boolean;
}
