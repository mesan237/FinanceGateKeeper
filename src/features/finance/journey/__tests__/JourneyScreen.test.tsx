import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import i18n from '@/i18n';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/budget/BaselineCard', () => ({ BaselineCard: () => null }));

jest.mock('@/features/finance/journey/journey.service', () => ({
  getJourney: jest.fn(),
  markPictureReviewed: jest.fn().mockResolvedValue(undefined),
  skipToStep: jest.fn().mockResolvedValue(undefined),
}));

import { JourneyScreen } from '@/features/finance/journey/JourneyScreen';
import * as service from '@/features/finance/journey/journey.service';
import type { Journey, JourneyStepKey, JourneyStepStatus } from '@/features/finance/journey/journey.types';
import { formatCurrency } from '@/utils/formatCurrency';
import { toISODate } from '@/utils/formatDate';
import { nextMonthISO } from '@/utils/monthMath';

const mocked = service as jest.Mocked<typeof service>;

const KEYS: JourneyStepKey[] = ['observe', 'see', 'plan', 'optimize', 'grow'];

function journeyAt(current: JourneyStepKey, overrides: Partial<Journey> = {}): Journey {
  const at = KEYS.indexOf(current);
  return {
    current,
    steps: KEYS.map((key, i) => ({
      key,
      status: (i < at ? 'done' : i === at ? 'current' : 'locked') as JourneyStepStatus,
    })),
    observe: { recorded: 1, needed: 3 },
    start: null,
    latest: null,
    plannedMonth: null,
    beatStartMonth: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getJourney.mockResolvedValue(journeyAt('observe'));
});

describe('JourneyScreen (VS-63)', () => {
  it('lists the five steps with where each stands', async () => {
    render(<JourneyScreen />);

    expect(await screen.findByText('Observe')).toBeTruthy();
    for (const title of ['See', 'Plan', 'Optimize', 'Grow']) expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText('You are here')).toBeTruthy();
    expect(screen.getAllByText('Locked')).toHaveLength(4);
  });

  it('shows the months recorded while observing', async () => {
    render(<JourneyScreen />);

    expect(await screen.findByText('1 of 3 complete months')).toBeTruthy();
  });

  it('shows what a locked step unlocks, as a preview', async () => {
    render(<JourneyScreen />);

    expect(await screen.findByText('Unlocks optimization: where to cut back.')).toBeTruthy();
  });

  it('skips ahead to the next step after a warning', async () => {
    render(<JourneyScreen />);

    fireEvent.press(await screen.findByTestId('journey-skip-see'));
    expect(screen.getByText(/starting point less honest/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('journey-skip-confirm'));

    await waitFor(() => expect(mocked.skipToStep).toHaveBeenCalledWith('see'));
  });

  it('offers no skip on a step further than the next one', async () => {
    render(<JourneyScreen />);

    await screen.findByTestId('journey-skip-see');
    expect(screen.queryByTestId('journey-skip-plan')).toBeNull();
  });

  it('summarises the first months on See and records "I have seen it"', async () => {
    mocked.getJourney.mockResolvedValue(
      journeyAt('see', { start: { total: 180_000, fixed: 100_000, variable: 80_000, unexpected: 0 } }),
    );
    render(<JourneyScreen />);

    expect(
      await screen.findByText(
        `Your first months cost ${formatCurrency(180_000)} a month: ${formatCurrency(100_000)} fixed, ${formatCurrency(80_000)} variable.`,
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByTestId('journey-reviewed'));

    await waitFor(() => expect(mocked.markPictureReviewed).toHaveBeenCalled());
  });

  it('opens next month’s planner from Plan', async () => {
    mocked.getJourney.mockResolvedValue(journeyAt('plan'));
    render(<JourneyScreen />);

    fireEvent.press(await screen.findByTestId('journey-plan'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/plan',
      params: { month: nextMonthISO(toISODate(new Date()).slice(0, 7)) },
    });
  });

  it('compares variable spending with the start on Optimize', async () => {
    mocked.getJourney.mockResolvedValue(
      journeyAt('optimize', {
        start: { total: 180_000, fixed: 100_000, variable: 80_000, unexpected: 0 },
        latest: { month: '2026-09', variable: 90_000 },
      }),
    );
    render(<JourneyScreen />);

    expect(await screen.findByText(/Variable spending: .* in September 2026, against/)).toBeTruthy();
  });

  it('opens goals from Grow', async () => {
    mocked.getJourney.mockResolvedValue(journeyAt('grow'));
    render(<JourneyScreen />);

    fireEvent.press(await screen.findByTestId('journey-goals'));

    expect(mockPush).toHaveBeenCalledWith('/goals');
  });

  it('reads in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      render(<JourneyScreen />);
      expect(await screen.findByText('Observer')).toBeTruthy();
      expect(screen.getByText('1 mois complets sur 3')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
