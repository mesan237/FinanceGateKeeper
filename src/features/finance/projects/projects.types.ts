import type { FundingSource, ProjectStatus } from '@/constants/projects';

// Re-exported so this slice's types have their documented home here, while the
// enums' single source of truth stays in `@/constants/projects` (mirrors how
// `funds.types` re-exports `FundType`).
export type { FundingSource, ProjectStatus };

/** A persisted project row — one funding goal. */
export interface Project {
  id: number;
  name: string;
  targetAmount: number;
  fundedAmount: number;
  /** 1 = highest priority; drives the funding cascade. */
  priorityRank: number;
  deadline: string | null;
  status: ProjectStatus;
  createdAt: string;
}

/** A soft-deleted project awaiting recovery or purge from the recycle bin. */
export interface DeletedProject extends Project {
  /** ISO timestamp the project was soft-deleted. */
  deletedAt: string;
}

/** What the create form supplies; rank/status are assigned by the service. */
export interface NewProject {
  name: string;
  targetAmount: number;
  deadline?: string | null;
}

/** Fields the edit form may change. */
export interface ProjectPatch {
  name?: string;
  targetAmount?: number;
  deadline?: string | null;
}

/** A single contribution to a project — the funded-amount audit trail. */
export interface ProjectTransaction {
  id: number;
  projectId: number;
  amount: number;
  date: string;
  source: FundingSource;
  createdAt: string;
}

/**
 * A project's estimated completion. `monthsRemaining`/`completionDate` are
 * `null` when there is no funding rate to project from; `0`/today when the
 * project is already fully funded.
 */
export interface TimelineEstimate {
  projectId: number;
  monthsRemaining: number | null;
  completionDate: string | null;
}

/** A detected change between two timeline estimates for the same project. */
export interface TimelineShift {
  projectId: number;
  previous: string | null;
  next: string | null;
  /** Signed month delta (positive = later); magnitude meets the alert threshold. */
  shiftedMonths: number;
}
