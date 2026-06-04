/**
 * The four allocation buckets the budget engine distributes income across.
 * Closed enum (the user cannot add new buckets), so it lives in constants —
 * same rationale as `incomeSources.ts`: features may import constants but
 * constants may not import features.
 *
 * The tuple's element order is also the **default display order** used when an
 * allocation row is first created. Once stored, the order can be customised per
 * month via `priority_order` (see VS-06 / budget.service.ts).
 */
export const BUCKET_VALUES = [
  'emergency_fund',
  'savings',
  'projects',
  'expenses',
] as const;

/** A valid bucket key — one of `BUCKET_VALUES`. */
export type Bucket = (typeof BUCKET_VALUES)[number];

/** Display labels for each bucket. */
export const BUCKET_LABELS: Record<Bucket, string> = {
  emergency_fund: 'Emergency Fund',
  savings: 'Savings',
  projects: 'Projects',
  expenses: 'Expenses',
};

/** O(1) runtime validation set, mirroring `INCOME_SOURCE_VALUES`. */
export const BUCKET_SET: ReadonlySet<string> = new Set(BUCKET_VALUES);

/**
 * Default percentages and priority order seeded into a fresh `allocations`
 * row. Sums to 100. Order matches the PRD §5.2 priority chain:
 * Emergency Fund → Savings → Projects → Expenses.
 */
export const DEFAULT_ALLOCATION = {
  emergencyFundPct: 10,
  savingsPct: 10,
  projectsPct: 15,
  expensesPct: 65,
  priorityOrder: [...BUCKET_VALUES] as Bucket[],
} as const;
