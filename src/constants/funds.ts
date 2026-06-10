/**
 * The two fund kinds the app tracks. Closed enum (the user cannot add new fund
 * types), so it lives in constants — same rationale as `allocation.ts`/
 * `incomeSources.ts`: features may import constants but constants never import
 * features.
 */
export const FUND_TYPE_VALUES = ['emergency', 'savings'] as const;

/** A valid fund type — one of `FUND_TYPE_VALUES`. */
export type FundType = (typeof FUND_TYPE_VALUES)[number];

/** Display labels for each fund type. */
export const FUND_TYPE_LABELS: Record<FundType, string> = {
  emergency: 'Emergency Fund',
  savings: 'Savings',
};

/** O(1) runtime validation set, mirroring `BUCKET_SET`. */
export const FUND_TYPE_SET: ReadonlySet<string> = new Set(FUND_TYPE_VALUES);

/** The direction of a fund transaction. Closed enum guarded by a CHECK in SQL. */
export const TRANSACTION_DIRECTION_VALUES = ['deposit', 'withdrawal'] as const;

/** A valid transaction direction — one of `TRANSACTION_DIRECTION_VALUES`. */
export type TransactionDirection = (typeof TRANSACTION_DIRECTION_VALUES)[number];

/**
 * Default target (in FCFA) seeded for the emergency fund on first run. The
 * emergency fund's target is mandatory (PRD §5.3) and user-editable; this is
 * just the starting value — it matches the worked example in the PRD/KANBAN.
 * Savings is seeded with no target (`null`).
 */
export const DEFAULT_EMERGENCY_TARGET = 500000;
