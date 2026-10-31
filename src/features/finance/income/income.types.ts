import type { IncomeSourceKey } from '@/constants/incomeSources';

/**
 * Where an income row sits in the allocation flow (VS-19).
 * - `pending`: held in the unallocated pool; excluded from the expense budget
 *   and not yet deposited to any fund/project.
 * - `allocated`: confirmed; counted in the month's expense budget and its
 *   fund/project portions deposited.
 */
export type IncomeAllocationStatus = 'allocated' | 'pending';

/**
 * Where income comes from (VS-91): a built-in (it has a `key`, shown in the
 * active language) or one the user made (no key, shown by `name`). One level
 * deep: a subsource has a top-level `parentId`.
 */
export interface IncomeSource {
  id: number;
  key: IncomeSourceKey | null;
  name: string;
  parentId: number | null;
  /** Off the picker; income already logged on it keeps it. */
  isHidden: boolean;
  sortOrder: number;
}

/** A persisted income row. */
export interface Income {
  id: number;
  amount: number;
  /** The `income_sources` row, a top-level source or a subsource (VS-91). */
  sourceId: number;
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
export type UpdateIncome = Pick<Income, 'amount' | 'sourceId' | 'date' | 'note' | 'accountId'>;

/** Filter applied to the income history. All fields are optional. */
export interface IncomeFilter {
  /** A source and its subsources. */
  sourceId?: number;
  from?: string;
  to?: string;
}
