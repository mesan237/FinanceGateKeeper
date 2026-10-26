import type { JourneyFigures } from '@/types/journey';

import type { Journey } from './journey.types';

/**
 * The figures other screens lead with by step (UX-24), read off a journey: the
 * starting point's typical month and variable spending, the latest complete
 * month's variable spending, and this month's logging. Pure.
 */
export function journeyFigures(journey: Journey): JourneyFigures {
  return {
    typicalMonth: journey.start?.total ?? null,
    variableStart: journey.start?.variable ?? null,
    variableLatest: journey.latest ? { month: journey.latest.month, amount: journey.latest.variable } : null,
    logging: {
      month: journey.logging.month,
      loggedDays: journey.logging.loggedDays,
      daysSoFar: journey.logging.daysSoFar,
    },
  };
}
