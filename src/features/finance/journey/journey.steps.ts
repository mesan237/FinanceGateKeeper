import type { JourneyStepKey } from './journey.types';

/** The journey's steps, in order (VS-63). Kept apart from the service so screens can read it without the database. */
export const JOURNEY_STEPS: readonly JourneyStepKey[] = ['observe', 'see', 'plan', 'optimize', 'grow'];
