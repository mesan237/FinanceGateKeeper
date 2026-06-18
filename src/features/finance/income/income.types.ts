import type { IncomeSource } from '@/constants/incomeSources';

// Re-exported so this slice's types have their documented home here, while the
// enum's single source of truth stays in `@/constants/incomeSources` (see that
// file for why it lives in constants rather than the feature).
export type { IncomeSource };

/**
 * Where an income row sits in the allocation flow (VS-19).
 * - `pending`: held in the unallocated pool; excluded from the expense budget
 *   and not yet deposited to any fund/project.
 * - `allocated`: confirmed; counted in the month's expense budget and its
 *   fund/project portions deposited.
 */
export type IncomeAllocationStatus = 'allocated' | 'pending';

/** A persisted income row. */
export interface Income {
  id: number;
  amount: number;
  source: IncomeSource;
  note: string | null;
  date: string;
  /** Destination wallet, or null for legacy/unattributed income (VS-18). */
  accountId: number | null;
  /** Allocation lifecycle state (VS-19). */
  allocationStatus: IncomeAllocationStatus;
  createdAt: string;
}

/**
 * The shape accepted by `createIncome` — id and createdAt are assigned on
 * insert. `accountId` is optional so the allocation trigger and other
 * non-UI callers need not supply a wallet. `allocationStatus` is optional and
 * defaults to `pending` so new income is held until the user allocates it.
 */
export type NewIncome = Omit<Income, 'id' | 'createdAt' | 'accountId' | 'allocationStatus'> & {
  accountId?: number | null;
  allocationStatus?: IncomeAllocationStatus;
};

/**
 * The full-row patch accepted by `updateIncome` (VS-20). Always carries every
 * editable field — the allocated-row lock compares `amount`/`date` against the
 * stored row, which is only meaningful when the caller states both explicitly.
 */
export type UpdateIncome = Pick<Income, 'amount' | 'source' | 'date' | 'note' | 'accountId'>;

/** Filter applied to the income history. All fields are optional. */
export interface IncomeFilter {
  source?: IncomeSource;
  from?: string;
  to?: string;
}
