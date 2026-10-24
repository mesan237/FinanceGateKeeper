import type { JourneyStepKey } from '@/types/journey';

/** The journey's steps, in order (VS-63). Shared for the stage provider (UX-03). */
export const JOURNEY_STEPS: readonly JourneyStepKey[] = ['observe', 'see', 'plan', 'optimize', 'grow'];
