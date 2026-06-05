import type { FundType, TransactionDirection } from '@/constants/funds';

// Re-exported so this slice's types have their documented home here, while the
// enums' single source of truth stays in `@/constants/funds` (mirrors how
// `budget.types` re-exports `Bucket`).
export type { FundType, TransactionDirection };

/** A persisted fund row — one per `FundType`. */
export interface Fund {
  id: number;
  type: FundType;
  /** Mandatory for `emergency`, optional (`null`) for `savings`. Whole FCFA. */
  targetAmount: number | null;
  currentAmount: number;
  isTargetMet: boolean;
  createdAt: string;
}

/** A single deposit or withdrawal against a fund — the balance audit trail. */
export interface FundTransaction {
  id: number;
  fundId: number;
  amount: number;
  direction: TransactionDirection;
  reason: string | null;
  date: string;
  createdAt: string;
}

/**
 * A fund's progress toward its goal. `pct` is `null` when the fund has no
 * target (savings shows its balance only).
 */
export interface FundProgress {
  fundId: number;
  type: FundType;
  current: number;
  target: number | null;
  pct: number | null;
}

/**
 * Result of `depositToFund`. `targetNewlyMet` is `true` only on the deposit
 * that first crosses the target, letting the caller trigger redistribution
 * exactly once (the budget feature owns that side effect — see
 * `AllocationScreen`/`redistributeEmergencyPct`).
 */
export interface DepositResult {
  fund: Fund;
  targetNewlyMet: boolean;
}
