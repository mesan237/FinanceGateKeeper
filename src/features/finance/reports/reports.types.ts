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

export interface OptimizationSuggestion {
  type: 'increase';
  categoryLabel: string;
  pctChange: number;
  message: string;
}

export interface MonthlyReport {
  month: string;
  incomeTotal: number;
  expensePerformance: ExpensePerformance;
  categoryBreakdown: CategorySpend[];
  debtSummary: DebtSummaryData;
  /** null when there is no income/expense data for the previous month. */
  comparison: MonthComparison | null;
  suggestions: OptimizationSuggestion[];
}
