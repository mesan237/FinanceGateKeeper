import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

const mockSegments: { current: string[] } = { current: ['(drawer)', '(tabs)', 'dashboard'] };

jest.mock('expo-router', () => ({ useSegments: () => mockSegments.current }));

const mockConsent: { current: 'granted' | 'denied' | 'unset' } = { current: 'granted' };

jest.mock('@/services/analytics', () => {
  const actual = jest.requireActual('@/services/analytics/analytics.sanitize');
  return {
    initAnalytics: jest.fn().mockResolvedValue(undefined),
    getAnalyticsConsent: () => mockConsent.current,
    subscribeAnalyticsConsent: () => () => {},
    track: jest.fn(),
    trackScreen: jest.fn(),
    flushAnalytics: jest.fn(),
    screenNameFromSegments: actual.screenNameFromSegments,
  };
});

import { flushAnalytics, track, trackScreen } from '@/services/analytics';

import { resetLaunchTrackedForTests, useAnalyticsLifecycle } from '../useAnalyticsLifecycle';

let appStateHandler: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  resetLaunchTrackedForTests();
  mockSegments.current = ['(drawer)', '(tabs)', 'dashboard'];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler as (state: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
});

it('sends app_opened once per launch, however often the root re-renders or remounts', async () => {
  const first = renderHook(() => useAnalyticsLifecycle());
  await waitFor(() => expect(track).toHaveBeenCalledWith('app_opened', { trigger: 'launch' }));
  first.rerender(undefined);
  first.unmount();
  renderHook(() => useAnalyticsLifecycle());
  await waitFor(() => expect(trackScreen).toHaveBeenCalled());

  expect(jest.mocked(track).mock.calls.filter(([e]) => e === 'app_opened')).toHaveLength(1);
});

it('sends the route template on each navigation, not on re-renders', async () => {
  const { rerender } = renderHook(() => useAnalyticsLifecycle());
  await waitFor(() => expect(trackScreen).toHaveBeenCalledWith('/dashboard'));

  rerender(undefined);
  rerender(undefined);
  mockSegments.current = ['expenses', '[id]'];
  rerender(undefined);

  expect(jest.mocked(trackScreen).mock.calls).toEqual([['/dashboard'], ['/expenses/[id]']]);
});

it('counts a return from the background as an open and flushes on leaving', async () => {
  renderHook(() => useAnalyticsLifecycle());
  await waitFor(() => expect(appStateHandler).not.toBeNull());

  appStateHandler!('background');
  appStateHandler!('active');

  expect(flushAnalytics).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledWith('app_opened', { trigger: 'foreground' });
});
