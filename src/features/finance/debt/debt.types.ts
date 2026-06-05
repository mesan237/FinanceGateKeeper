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
}

/** Fields the edit form may change on a debt. */
export interface DebtPatch {
  personName?: string;
  amount?: number;
  dueDate?: string | null;
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
