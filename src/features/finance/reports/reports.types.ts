// Types for the reports slice. Reports is a read-only aggregation layer over the
// other features, so these shapes are self-contained — no cross-feature type
// imports.

/** A single category's contribution to a spending total. */
export interface CategorySpend {
  categoryId: number;
  categoryLabel: string;
  amount: number;
  /** 0–100 percentage of the period's total spend. */
  pct: number;
}

/** A single day's spend within a weekly report. */
export interface DaySpend {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
  totalSpent: number;
  totalIncome: number;
  /** Top 3 categories by amount, or fewer if there were < 3 categories. */
  topCategories: CategorySpend[];
  /** 7 entries Mon→Sun; days with no spend are 0. */
  spendingByDay: DaySpend[];
  /** Highest-spend day; null if `totalSpent === 0`. */
  peakDay: DaySpend | null;
}

export interface ExpensePerformance {
  /** The month's spending budget: explicit total when set, else income. */
  planned: number;
  /** Total expenses logged. */
  actual: number;
  /** planned − actual (may be negative). */
  remaining: number;
}

export interface DebtSummaryData {
  totalLent: number;
  totalOwed: number;
}

export interface CategoryDelta {
  categoryId: number;
  categoryLabel: string;
  current: number;
  previous: number;
  /** null when previous === 0 (undefined growth rate). */
  pctChange: number | null;
}

export interface MonthComparison {
  month: string; // YYYY-MM (current)
  previousMonth: string; // YYYY-MM
  categories: CategoryDelta[];
}

/** The month's imprévus: the expenses the user marked as unplanned (VS-38). */
export interface UnplannedSummary {
  count: number;
  /** What they cost, in FCFA. */
  total: number;
  /** Their share of the month's spending, 0–100 and unrounded; 0 when nothing was spent. */
  sharePct: number;
  /** The previous month's figures, for comparison. */
  previous: { count: number; total: number };
}

export interface MonthlyReport {
  month: string;
  incomeTotal: number;
  expensePerformance: ExpensePerformance;
  categoryBreakdown: CategorySpend[];
  unplanned: UnplannedSummary;
  debtSummary: DebtSummaryData;
  /** null when there is no income/expense data for the previous month. */
  comparison: MonthComparison | null;
}

// ---- VS-41: the typical month ------------------------------------------------

/** How an expense counts in the typical month: a commitment, a choice, or a surprise. */
export type SpendKind = 'fixed' | 'variable' | 'unexpected';

/** One month of the observation window and whether it is complete enough to trust. */
export interface ProfileMonth {
  /** `YYYY-MM`. */
  month: string;
  /** Share of the month's days with an expense or a zero-spend confirmation, 0–1. */
  coverage: number;
  isComplete: boolean;
}

/** A category's monthly spend across the complete months of the window. */
export interface ProfileCategory {
  categoryId: number;
  categoryLabel: string;
  /** Average per complete month, whole FCFA. */
  average: number;
  /** The cheapest and dearest complete month — the room a habit change can win back. */
  lowest: number;
  highest: number;
}

/** Average monthly spend, split by kind. `total` is the sum of the three. */
export interface ProfileAverage {
  total: number;
  fixed: number;
  variable: number;
  unexpected: number;
}

/**
 * "Your typical month": what the last complete months actually cost, and which
 * part of it is fixed versus open to new habits. `average` is null until at
 * least one month in the window is complete.
 */
export interface SpendingProfile {
  /** The observation window, oldest first. */
  months: ProfileMonth[];
  average: ProfileAverage | null;
  /** Income received per complete month (VS-46); null until a month is complete. */
  incomeAverage: number | null;
  /** Variable categories, highest average first — where behaviour can change. */
  variableCategories: ProfileCategory[];
  /** Fixed categories, highest average first. */
  fixedCategories: ProfileCategory[];
}

// ---- VS-58: the starting point -----------------------------------------------

/** The first three complete months, fixed once recorded: what spending was before any change. */
export interface StartingPoint {
  /** The complete months found so far, oldest first; at most `needed`. */
  recorded: string[];
  /** How many complete months the starting point needs (3). */
  needed: number;
  /** The profile of those months once all are recorded; null before. */
  profile: SpendingProfile | null;
}
