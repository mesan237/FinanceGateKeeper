/**
 * The five steps to control over spending, in order (VS-63). Shared so screens
 * outside the journey slice can read the current step from
 * `components/JourneyStageProvider` (UX-03) without importing `journey`.
 */
export type JourneyStepKey = 'observe' | 'see' | 'plan' | 'optimize' | 'grow';
