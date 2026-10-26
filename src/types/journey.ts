/**
 * The five steps to control over spending, in order (VS-63). Shared so screens
 * outside the journey slice can read the current step from
 * `components/JourneyStageProvider` (UX-03) without importing `journey`.
 */
export type JourneyStepKey = 'observe' | 'see' | 'plan' | 'optimize' | 'grow';

/**
 * The few journey figures other screens lead with by step (UX-24), shared
 * through `components/JourneyStageProvider` so Home and Reports never import
 * the journey slice. Whole FCFA.
 */
export interface JourneyFigures {
  /** What a month cost on average in the starting point; null until it is recorded. */
  typicalMonth: number | null;
  /** The starting point's average variable spending; null until it is recorded. */
  variableStart: number | null;
  /** The latest complete month after the starting point and its variable spending. */
  variableLatest: { month: string; amount: number } | null;
  /** The running month's logging so far. */
  logging: { month: string; loggedDays: number; daysSoFar: number };
}
