/**
 * The lifecycle states a project can be in. Closed enum (guarded by a CHECK in
 * SQL), so it lives in constants — same rationale as `funds.ts`/`allocation.ts`:
 * features may import constants but constants may not import features.
 */
export const PROJECT_STATUS_VALUES = ['active', 'completed', 'paused'] as const;

/** A valid project status — one of `PROJECT_STATUS_VALUES`. */
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

/** Display labels for each project status. */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  paused: 'Paused',
};

/** O(1) runtime validation set, mirroring `FUND_TYPE_SET`. */
export const PROJECT_STATUS_SET: ReadonlySet<string> = new Set(PROJECT_STATUS_VALUES);

/** Where a project's funding came from. Closed enum guarded by a CHECK in SQL. */
export const FUNDING_SOURCE_VALUES = ['allocation', 'manual'] as const;

/** A valid funding source — one of `FUNDING_SOURCE_VALUES`. */
export type FundingSource = (typeof FUNDING_SOURCE_VALUES)[number];

/**
 * How many months a project's estimated completion date must move (in either
 * direction) before the app surfaces a `TimelineRecalcAlert`. Keeps tiny,
 * rounding-driven wobble from nagging the user.
 */
export const TIMELINE_SHIFT_THRESHOLD_MONTHS = 1;
