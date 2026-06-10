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
