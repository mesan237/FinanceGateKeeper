import type { MonthLoggingStatus } from '@/features/finance/expenses/expenses.coverage';
import type { ProfileAverage } from '@/features/finance/reports/reports.types';

/** The five steps to control over spending, in order (VS-63). */
export type JourneyStepKey = 'observe' | 'see' | 'plan' | 'optimize' | 'grow';

/**
 * Where a step stands: passed on the evidence (`done`), jumped over with
 * "skip ahead" (`skipped`), the one to work on (`current`), or still ahead
 * (`locked`).
 */
export type JourneyStepStatus = 'done' | 'skipped' | 'current' | 'locked';

/** One step and where it stands. */
export interface JourneyStep {
  key: JourneyStepKey;
  status: JourneyStepStatus;
}

/** What the data says about each step: the input to {@link resolveJourney}. */
export interface JourneyEvidence {
  /** Complete months recorded toward the starting point so far. */
  recordedMonths: number;
  /** Complete months the starting point needs (3). */
  neededMonths: number;
  /** The user tapped "I've seen it" on their first months. */
  pictureReviewed: boolean;
  /** The first complete month after the starting point that had a budget. */
  plannedMonth: string | null;
  /** The first complete month, from the planned one on, whose variable spending came in under the start. */
  beatStartMonth: string | null;
  /** How many steps had been passed on the evidence when last read (0–4). */
  reached: number;
  /** The step skipped ahead to (0–4), 0 when never skipped. */
  skippedTo: number;
}

/** The running month's logging, as the Observe step shows it (UX-05–07). */
export interface ObserveLogging extends MonthLoggingStatus {
  /** Recent days before today with nothing logged, newest first, that may still be marked as no-spend. */
  missedDays: string[];
  /** The day of the month the user began, when this is their first month and it can no longer count. */
  startedOn: number | null;
}

/** The journey as the path screen and dashboard card read it. */
export interface Journey {
  current: JourneyStepKey;
  steps: JourneyStep[];
  /** Complete months recorded toward the starting point, out of `needed`. */
  observe: { recorded: number; needed: number };
  /** The running month's logging, so the Observe step shows progress before a month completes. */
  logging: ObserveLogging;
  /** What a month cost on average in the starting point; null until it is recorded. */
  start: ProfileAverage | null;
  /** The latest complete month after the starting point and its variable spending. */
  latest: { month: string; variable: number } | null;
  plannedMonth: string | null;
  beatStartMonth: string | null;
}
