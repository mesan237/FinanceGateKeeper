/**
 * Closed enums for the people ledger, guarded by CHECK constraints in SQL, so
 * they live in constants — features may import constants but not vice versa
 * (mirrors `funds.ts`/`projects.ts`).
 */

/** Which way a debt points: `lent` = they owe me, `owed` = I owe them. */
export const DEBT_DIRECTION_VALUES = ['lent', 'owed'] as const;

/** A valid debt direction — one of `DEBT_DIRECTION_VALUES`. */
export type DebtDirection = (typeof DEBT_DIRECTION_VALUES)[number];

/** Display labels for each direction. */
export const DEBT_DIRECTION_LABELS: Record<DebtDirection, string> = {
  lent: 'Lent',
  owed: 'Owed',
};

/** O(1) runtime validation set, mirroring `PROJECT_STATUS_SET`. */
export const DEBT_DIRECTION_SET: ReadonlySet<string> = new Set(DEBT_DIRECTION_VALUES);

/** A debt is outstanding (`pending`) until it is fully repaid (`settled`). */
export const DEBT_STATUS_VALUES = ['pending', 'settled'] as const;

/** A valid debt status — one of `DEBT_STATUS_VALUES`. */
export type DebtStatus = (typeof DEBT_STATUS_VALUES)[number];

/** Display labels for each status. */
export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  pending: 'Pending',
  settled: 'Settled',
};

/** O(1) runtime validation set. */
export const DEBT_STATUS_SET: ReadonlySet<string> = new Set(DEBT_STATUS_VALUES);

/**
 * How many days before its due date a pending debt starts reminding ("due
 * soon"). Past the due date it is "overdue". Keeps the reminder window in one
 * place for the service and its tests.
 */
export const DEBT_DUE_SOON_DAYS = 3;
