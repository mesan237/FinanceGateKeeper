import type { DebtDirection, DebtStatus } from '@/constants/debt';

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
  /** Sum of live repayments. */
  paid: number;
  /** What is still owed: `amount - paid` while pending, 0 once settled. */
  outstanding: number;
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
