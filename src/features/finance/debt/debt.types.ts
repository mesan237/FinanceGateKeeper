import type { DebtDirection, DebtStatus } from '@/constants/debt';
import type { CycleFrequency } from '@/utils/cycleDate';

// Re-exported so this slice's types have their documented home here, while the
// enums' single source of truth stays in `@/constants/debt` (mirrors how
// `projects.types` re-exports `ProjectStatus`).
export type { DebtDirection, DebtStatus };

/** A persisted debt row — one informal loan in one direction. */
export interface Debt {
  id: number;
  personName: string;
  amount: number;
  direction: DebtDirection;
  /** When the loan happened (`YYYY-MM-DD`). */
  date: string;
  dueDate: string | null;
  status: DebtStatus;
  note: string | null;
  /** ISO timestamp set when the debt is settled; `null` while pending. */
  settledAt: string | null;
  createdAt: string;
  /** Wallet the loan itself went through, or null when it moved no wallet (VS-44). */
  accountId: number | null;
  /** The total paid back, interest included; null when it is just the amount (VS-54). */
  totalToRepay: number | null;
  /** An equal-instalment schedule, or null (VS-54). */
  schedule: DebtSchedule | null;
  /** `totalToRepay ?? amount`: what repayments add up to once settled. */
  repayable: number;
  /** Sum of live repayments. */
  paid: number;
  /** What is still owed: `repayable - paid` while pending, 0 once settled. */
  outstanding: number;
}

/** Equal instalments from `firstDate`, every week or month (VS-54). Dates are derived. */
export interface DebtSchedule {
  count: number;
  frequency: CycleFrequency;
  /** `YYYY-MM-DD` of the first instalment. */
  firstDate: string;
}

/** One instalment of a scheduled debt, derived — never stored (VS-54). */
export interface Instalment {
  n: number;
  dueDate: string;
  amount: number;
  /** `due`: today or within `DEBT_DUE_SOON_DAYS`. */
  status: 'paid' | 'overdue' | 'due' | 'upcoming';
  /** The repayment that paid it, if any. */
  payment: DebtPayment | null;
}

/** What a loan costs on top of the amount, and the equivalent monthly rate over its term. */
export interface LoanCost {
  cost: number;
  /** Percent a month, one decimal; null without an end date or without a cost. */
  monthlyRate: number | null;
}

/** What the create form supplies; `status` defaults to pending in the service. */
export interface NewDebt {
  personName: string;
  amount: number;
  direction: DebtDirection;
  dueDate?: string | null;
  note?: string | null;
  /** Defaults to today (`YYYY-MM-DD`) when omitted. */
  date?: string;
  /** Wallet the loan went through; omitted or null moves no wallet (VS-44). */
  accountId?: number | null;
  /** The total to be paid back, interest included; at least `amount` (VS-54). */
  totalToRepay?: number | null;
  /** An optional equal-instalment schedule (VS-54). */
  schedule?: DebtSchedule | null;
}

/** Fields the edit form may change on a debt. */
export interface DebtPatch {
  personName?: string;
  amount?: number;
  dueDate?: string | null;
  note?: string | null;
  accountId?: number | null;
}

/** One repayment of a debt (VS-44). */
export interface DebtPayment {
  id: number;
  debtId: number;
  amount: number;
  /** Wallet the money went through, or null. */
  accountId: number | null;
  /** `YYYY-MM-DD`. */
  date: string;
  note: string | null;
  createdAt: string;
  /** The instalment it paid, or null for a free repayment (VS-54). */
  instalment: number | null;
}

/** What `recordDebtPayment` takes. */
export interface NewDebtPayment {
  amount: number;
  accountId: number | null;
  /** `YYYY-MM-DD`. */
  date: string;
  note?: string | null;
}

/** Outstanding (pending) totals per direction, in FCFA. */
export interface OutstandingTotals {
  lent: number;
  owed: number;
}

/**
 * A pending debt whose due date warrants a reminder. `kind` is `dueSoon` within
 * the `DEBT_DUE_SOON_DAYS` window and `overdue` once the due date has passed.
 */
export interface DebtReminder {
  debtId: number;
  personName: string;
  amount: number;
  dueDate: string;
  kind: 'dueSoon' | 'overdue';
}
