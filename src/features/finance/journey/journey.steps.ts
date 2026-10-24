import type { BaselineStep } from '@/features/finance/budget/budget.types';

import type { JourneyStepKey } from './journey.types';

/** The journey's steps, in order (VS-63). Kept apart from the service so screens can read it without the database. */
export const JOURNEY_STEPS: readonly JourneyStepKey[] = ['observe', 'see', 'plan', 'optimize', 'grow'];

/**
 * The set-up checklist items each step asks for (UX-09); undefined means all of
 * them. Observing needs true wallet balances; seeing what a month costs needs
 * the fixed/variable split; bills, debts and estimates matter once planning.
 */
export const BASELINE_BY_STEP: Readonly<Record<JourneyStepKey, ReadonlyArray<BaselineStep['key']> | undefined>> = {
  observe: ['balances'],
  see: ['balances', 'costTypes'],
  plan: undefined,
  optimize: undefined,
  grow: undefined,
};
