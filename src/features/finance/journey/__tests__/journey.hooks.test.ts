import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { JourneyStageProvider, useJourneyFigures, useJourneyStage } from '@/components/JourneyStageProvider';

jest.mock('@/features/finance/journey/journey.service', () => ({
  getJourney: jest.fn(),
  markPictureReviewed: jest.fn().mockResolvedValue(undefined),
  skipToStep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/finance/journey/journey.logging', () => ({
  markNoSpendDay: jest.fn().mockResolvedValue(undefined),
}));

import { useJourney } from '@/features/finance/journey/journey.hooks';
import * as logging from '@/features/finance/journey/journey.logging';
import * as service from '@/features/finance/journey/journey.service';
import type { Journey } from '@/features/finance/journey/journey.types';

const mocked = service as jest.Mocked<typeof service>;
const mockedLogging = logging as jest.Mocked<typeof logging>;

const JOURNEY: Journey = {
  current: 'observe',
  steps: [],
  observe: { recorded: 1, needed: 3 },
  logging: {
    month: '2026-10',
    loggedDays: 1,
    daysSoFar: 1,
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
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getJourney.mockResolvedValue(JOURNEY);
});

describe('useJourney (VS-63)', () => {
  it('loads the journey', async () => {
    const { result } = renderHook(() => useJourney());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.journey).toEqual(JOURNEY);
  });

  it('publishes the current step for the rest of the app (UX-03)', async () => {
    mocked.getJourney.mockResolvedValue({ ...JOURNEY, current: 'see' });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(JourneyStageProvider, null, children);

    const { result } = renderHook(() => ({ journey: useJourney(), stage: useJourneyStage() }), { wrapper });

    await waitFor(() => expect(result.current.stage).toBe('see'));
  });

  it('publishes the figures the other screens lead with (UX-24)', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(JourneyStageProvider, null, children);

    const { result } = renderHook(() => ({ journey: useJourney(), figures: useJourneyFigures() }), { wrapper });

    await waitFor(() => expect(result.current.figures?.logging).toEqual({ month: '2026-10', loggedDays: 1, daysSoFar: 1 }));
  });

  it('reports a load failure as an error', async () => {
    mocked.getJourney.mockRejectedValueOnce(new Error('disk'));

    const { result } = renderHook(() => useJourney());

    await waitFor(() => expect(result.current.error).toBe('disk'));
  });

  it('records "I have seen it" and re-reads', async () => {
    const { result } = renderHook(() => useJourney());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.reviewPicture());

    expect(mocked.markPictureReviewed).toHaveBeenCalled();
    expect(mocked.getJourney).toHaveBeenCalledTimes(2);
  });

  it('skips ahead and re-reads', async () => {
    const { result } = renderHook(() => useJourney());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.skipTo('plan'));

    expect(mocked.skipToStep).toHaveBeenCalledWith('plan');
    expect(mocked.getJourney).toHaveBeenCalledTimes(2);
  });

  it('marks a missed day as no-spend and re-reads (UX-06)', async () => {
    const { result } = renderHook(() => useJourney());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markNoSpend('2026-10-13'));

    expect(mockedLogging.markNoSpendDay).toHaveBeenCalledWith('2026-10-13');
    expect(mocked.getJourney).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('keeps a refusal on screen after re-reading', async () => {
    mockedLogging.markNoSpendDay.mockRejectedValueOnce(new Error('That day already has spending'));
    const { result } = renderHook(() => useJourney());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markNoSpend('2026-10-13'));

    expect(result.current.error).toBe('That day already has spending');
  });
});
