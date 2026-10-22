/**
 * The month's headline figures. `incomeTotal` doubles as the month's derived
 * budget — what the plan falls back to when no explicit total is set (VS-34).
 */
export interface MonthlyBudget {
  month: string;
  incomeTotal: number;
  expensesLogged: number;
  expensesRemaining: number;
}

/**
 * Result of a pre-save over-budget check for one prospective expense.
 * `overage` is 0 when not over; `remaining` is the budget left before the
 * prospective expense; `expenseBudget` is the month's spending budget —
 * the explicit total when set, otherwise the month's income.
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
  /** Where `derivedTotal` comes from: the income estimate, or income received (VS-47). */
  derivedSource: 'expected' | 'received';
  /** The typical-income estimate in force for the month; null when none was given. */
  expectedIncome: number | null;
  /** Income actually logged in the month so far. */
  receivedIncome: number;
  /** Income received beyond `totalBudget` — money that has no job yet. Never negative. */
  unbudgetedIncome: number;
  /** True when `unbudgetedIncome` has grown past what the user already chose to leave unbudgeted. */
  surplusNeedsJob: boolean;
  /** The goals' monthly amounts, taken out first — pay yourself first (VS-49). */
  setAside: number;
  /** `totalBudget - setAside`, never below zero: what the envelopes share and spending is measured against. */
  spendable: number;
  /** How far the goals' amounts exceed the total; 0 when they fit. */
  setAsideShortfall: number;
  /** Sum of category allocations (never includes rollover). */
  assigned: number;
  /** `spendable - assigned`; negative when over-allocated. */
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
  /** `plan.spendable + totalCarried` — everything spendable this month. */
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

// ---- VS-46: the baseline ----------------------------------------------------------

/** A question the baseline records an answer to. */
export type BaselineKind =
  | 'monthly_income'
  | 'income_regular'
  | 'pay_day'
  | 'monthly_essentials'
  | 'no_debts'
  | 'cost_types_reviewed'
  | 'checklist_hidden';

/** Whether the user typed a value or accepted one observed from logged months. */
export type FactSource = 'user' | 'observed';

/** One answer, with where it came from and when. */
export interface BaselineFact {
  value: number;
  source: FactSource;
  /** ISO timestamp. */
  setAt: string;
}

/** Everything the user has told the app; null where they have not answered. */
export interface Baseline {
  monthlyIncome: BaselineFact | null;
  incomeRegular: boolean | null;
  /** Day of the month the income usually lands; only for regular income. */
  payDay: number | null;
  monthlyEssentials: BaselineFact | null;
  noDebts: boolean;
  costTypesReviewed: boolean;
  checklistHidden: boolean;
}

/** The estimates form. */
export interface Estimates {
  monthlyIncome: number;
  incomeRegular: boolean;
  payDay: number | null;
  monthlyEssentials: number;
}

/** One setup step on the dashboard checklist. */
export interface BaselineStep {
  key: 'balances' | 'bills' | 'debts' | 'costTypes' | 'estimates';
  done: boolean;
}

// ---- VS-47: cash flow -------------------------------------------------------------

/**
 * Money already spoken for before the month ends: recurring bills still to be
 * logged, open planned purchases, and what is still owed on debts due. Overdue
 * items count — they are still owed.
 */
export interface CommittedMoney {
  recurring: number;
  planned: number;
  debts: number;
  /** Unpaid tontine contributions due by month end (VS-52). */
  tontines: number;
  total: number;
}

/** The three figures the Budget tab keeps apart (VS-47). */
export interface MoneyView {
  /** Cash on hand: the sum of every active wallet. */
  cash: number;
  /** The part of `cash` held in goal wallets (VS-49). */
  goalCash: number;
  committed: CommittedMoney;
  /** `cash - goalCash - committed.total`: free to spend before month end. May be negative. */
  safeToSpend: number;
}

/** One subcategory's share of a category's month (VS-56). */
export interface CategorySpendPart {
  /** null for spending filed under the category itself. */
  subcategoryId: number | null;
  /** Stored subcategory name; null with `subcategoryId`. */
  name: string | null;
  /** Net of refunds. */
  amount: number;
  /** Purchases in the part (refunds not counted). */
  count: number;
  /** Share of the category's net spend, 0–100. */
  sharePct: number;
  /** The part's usual month, over the category's complete months; null until one is complete. */
  usual: number | null;
}

/** Purchases that share a note — "Taxi ×18" (VS-56). */
export interface RepeatedSpend {
  /** The note as first written. */
  label: string;
  count: number;
  total: number;
}

/** Where a category's money went in one month: the Budget tab's drill-down (VS-56). */
export interface CategoryDetail {
  categoryId: number;
  /** Stored name; show it with `displayCategoryName`. */
  categoryName: string;
  month: string;
  /** Net spend, refunds included. */
  spent: number;
  /** Split by subcategory, largest first. Empty when no expense uses a subcategory. */
  parts: CategorySpendPart[];
  /** Up to three notes repeated across purchases, by total. */
  repeats: RepeatedSpend[];
  /** What can and cannot easily be cut, by `spendKindOf`. */
  kinds: { fixed: number; variable: number; unexpected: number };
  /**
   * Average over the complete months among the three before this one; null
   * until one is complete, 0 when those months had no spend here.
   */
  average: number | null;
}

/** One concrete way to spend less in a category next month (VS-56). */
export type NextMonthStep =
  /** A subcategory running above its usual month; `name` null is spending with no subcategory. */
  | { kind: 'backToUsual'; name: string | null; saving: number }
  /** A purchase that keeps coming back: skipping one in four. */
  | { kind: 'fewerRepeats'; label: string; count: number; saving: number };

/** A suggested budget for next month, and how to get there (VS-56). */
export interface NextMonthPlan {
  /**
   * `usual`: this month runs above a usual month, so aim for the usual one.
   * `trim`: already at or below usual (or no usual yet), so trim day-to-day spending by 10%.
   * `fixed`: only fixed bills, nothing to cut.
   */
  method: 'usual' | 'trim' | 'fixed';
  /** Where this month is heading (pace for the current month), whole FCFA. */
  current: number;
  /** The suggested budget, rounded to 500 FCFA and never below the fixed bills. */
  target: number;
  /** `target` against `current`, whole percent; null when `current` is 0. */
  changePct: number | null;
  /** Fixed bills in the month: they stay. */
  fixed: number;
  /** At most three, biggest saving first. */
  steps: NextMonthStep[];
}
