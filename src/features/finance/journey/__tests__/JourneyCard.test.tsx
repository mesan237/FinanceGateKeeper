import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/journey/journey.service', () => ({
  getJourney: jest.fn(),
  markPictureReviewed: jest.fn(),
  skipToStep: jest.fn(),
}));

// The last step seen on My path lives on the phone (VS-94).
jest.mock('@/services/uiPreferences', () => ({
  getPreference: jest.fn().mockResolvedValue(null),
  setPreference: jest.fn().mockResolvedValue(undefined),
}));

import { JourneyCard } from '@/features/finance/journey/JourneyCard';
import i18n from '@/i18n';
import { act } from '@testing-library/react-native';
import * as service from '@/features/finance/journey/journey.service';
import * as prefs from '@/services/uiPreferences';

const mocked = service as jest.Mocked<typeof service>;
const mockedPrefs = prefs as jest.Mocked<typeof prefs>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrefs.getPreference.mockResolvedValue(null);
  mockedPrefs.setPreference.mockResolvedValue(undefined);
  mocked.getJourney.mockResolvedValue({
    current: 'observe',
    steps: [
      { key: 'observe', status: 'current' },
      { key: 'see', status: 'locked' },
      { key: 'plan', status: 'locked' },
      { key: 'optimize', status: 'locked' },
      { key: 'grow', status: 'locked' },
    ],
    observe: { recorded: 2, needed: 3 },
    logging: {
      month: '2026-10',
      loggedDays: 12,
      daysSoFar: 15,
      daysInMonth: 31,
      needed: 25,
      canStillCount: true,
      missedDays: [],
      startedOn: null,
    },
    start: null,
    latest: null,
    plannedMonth: null,
    beatStartMonth: null,
    suggestions: [],
  });
});

describe('JourneyCard (VS-63)', () => {
  it('shows the current step and its progress', async () => {
    render(<JourneyCard />);

    expect(await screen.findByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByText('Observe')).toBeTruthy();
    expect(screen.getByText('2 of 3 complete months')).toBeTruthy();
  });

  it('leaves the days logged to the month card above it, saying them once (VS-94)', async () => {
    render(<JourneyCard />);

    await screen.findByTestId('journey-card');
    expect(screen.queryByText(/12 of 15 days/)).toBeNull();
  });

  it('flags a step reached since My path was last opened (VS-94)', async () => {
    const base = await mocked.getJourney();
    mocked.getJourney.mockResolvedValue({ ...base, current: 'see' });
    mockedPrefs.getPreference.mockResolvedValue('observe');
    render(<JourneyCard />);

    expect(await screen.findByTestId('journey-card-new')).toHaveTextContent('New step');
    expect(screen.getByText('Read what your first months really cost.')).toBeTruthy();
  });

  it('says nothing new for a step already seen', async () => {
    mockedPrefs.getPreference.mockResolvedValue('observe');
    render(<JourneyCard />);

    await screen.findByTestId('journey-card');
    await waitFor(() => expect(mockedPrefs.getPreference).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-card-new')).toBeNull();
  });

  it('opens the path tab', async () => {
    render(<JourneyCard />);

    fireEvent.press(await screen.findByTestId('journey-card'));

    expect(mockPush).toHaveBeenCalledWith('/path');
  });

  it('holds its place with a placeholder while the journey loads (UX-16)', () => {
    mocked.getJourney.mockReturnValue(new Promise(() => {}));
    render(<JourneyCard />);

    expect(screen.getByTestId('journey-card-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('journey-card')).toBeNull();
  });

  it('says when the journey cannot load, and "Try again" reloads it (UX-16)', async () => {
    const journey = await mocked.getJourney();
    mocked.getJourney.mockReset();
    // The card loads on mount and on focus, so every load fails until retried.
    mocked.getJourney.mockRejectedValue(new Error('disk'));
    render(<JourneyCard />);

    expect(await screen.findByTestId('journey-card-error')).toBeTruthy();
    expect(screen.getByText("Couldn't load your path")).toBeTruthy();
    mocked.getJourney.mockResolvedValue(journey);
    fireEvent.press(screen.getByTestId('journey-card-error-retry'));

    expect(await screen.findByTestId('journey-card')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('journey-card-error')).toBeNull());
  });
});

describe('JourneyCard — missed days (VS-89)', () => {
  const withMissed = async (missedDays: string[], current: 'observe' | 'see' = 'observe') => {
    const base = await mocked.getJourney();
    mocked.getJourney.mockResolvedValue({ ...base, current, logging: { ...base.logging, missedDays } });
  };

  it('says how many recent days have nothing logged, and where to catch up', async () => {
    await withMissed(['2026-10-14', '2026-10-13', '2026-10-11']);
    render(<JourneyCard />);
    expect(await screen.findByTestId('journey-card-missed')).toHaveTextContent(
      '3 days with nothing logged — catch up on My path',
    );
  });

  it('uses the singular for one day', async () => {
    await withMissed(['2026-10-14']);
    render(<JourneyCard />);
    expect(await screen.findByTestId('journey-card-missed')).toHaveTextContent(
      '1 day with nothing logged — catch up on My path',
    );
  });

  it('says nothing when no day is missed', async () => {
    render(<JourneyCard />);
    await screen.findByTestId('journey-card');
    expect(screen.queryByTestId('journey-card-missed')).toBeNull();
  });

  it('says nothing after Observe', async () => {
    await withMissed(['2026-10-14'], 'see');
    render(<JourneyCard />);
    await screen.findByTestId('journey-card');
    expect(screen.queryByTestId('journey-card-missed')).toBeNull();
  });

  it('reads in French', async () => {
    await withMissed(['2026-10-14', '2026-10-13']);
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<JourneyCard />);
    expect(await screen.findByTestId('journey-card-missed')).toHaveTextContent(
      '2 jours sans rien de noté — à rattraper dans Mon parcours',
    );
  });
});
