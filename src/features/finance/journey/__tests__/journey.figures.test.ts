import { journeyFigures } from '@/features/finance/journey/journey.figures';
import type { Journey } from '@/features/finance/journey/journey.types';

const LOGGING = {
  month: '2026-10',
  loggedDays: 18,
  daysSoFar: 23,
  daysInMonth: 31,
  needed: 25,
  canStillCount: true,
  missedDays: [],
  startedOn: null,
};

function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    current: 'see',
    steps: [],
    observe: { recorded: 3, needed: 3 },
    logging: LOGGING,
    start: { total: 150_000, fixed: 80_000, variable: 60_000, unexpected: 10_000 },
    latest: { month: '2026-09', variable: 52_000 },
    plannedMonth: null,
    beatStartMonth: null,
    ...overrides,
  };
}

describe('journeyFigures (UX-24)', () => {
  it('takes the typical month and variable spending from the starting point', () => {
    expect(journeyFigures(journey())).toEqual({
      typicalMonth: 150_000,
      variableStart: 60_000,
      variableLatest: { month: '2026-09', amount: 52_000 },
      logging: { month: '2026-10', loggedDays: 18, daysSoFar: 23 },
    });
  });

  it('has no starting figures until the starting point is recorded', () => {
    const figures = journeyFigures(journey({ start: null, latest: null }));

    expect(figures.typicalMonth).toBeNull();
    expect(figures.variableStart).toBeNull();
    expect(figures.variableLatest).toBeNull();
  });
});
