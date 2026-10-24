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

import { JourneyCard } from '@/features/finance/journey/JourneyCard';
import * as service from '@/features/finance/journey/journey.service';

const mocked = service as jest.Mocked<typeof service>;

beforeEach(() => {
  jest.clearAllMocks();
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
  });
});

describe('JourneyCard (VS-63)', () => {
  it('shows the current step and its progress', async () => {
    render(<JourneyCard />);

    expect(await screen.findByText('Step 1 of 5')).toBeTruthy();
    expect(screen.getByText('Observe')).toBeTruthy();
    expect(screen.getByText('2 of 3 months · this month 12 of 15 days logged')).toBeTruthy();
  });

  it('opens the path tab', async () => {
    render(<JourneyCard />);

    fireEvent.press(await screen.findByTestId('journey-card'));

    expect(mockPush).toHaveBeenCalledWith('/path');
  });

  it('renders nothing when the journey cannot load', async () => {
    mocked.getJourney.mockRejectedValue(new Error('disk'));
    render(<JourneyCard />);

    await waitFor(() => expect(mocked.getJourney).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-card')).toBeNull();
  });
});
