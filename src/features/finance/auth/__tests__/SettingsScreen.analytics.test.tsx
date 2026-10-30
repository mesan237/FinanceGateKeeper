import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/auth/auth.service', () => ({
  getAppSettings: jest.fn().mockResolvedValue({
    reminderTime: '21:00',
    notificationsEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    onboardingComplete: true,
    language: null,
  }),
  setReminderTime: jest.fn().mockResolvedValue(undefined),
  setNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
  getActionBarStyle: jest.fn().mockResolvedValue('explicit'),
  setActionBarStyle: jest.fn().mockResolvedValue(undefined),
  setLanguage: jest.fn().mockResolvedValue(undefined),
  keepLanguageOfExistingInstall: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/notifications/notifications.service', () => ({
  requestPermissions: jest.fn().mockResolvedValue(true),
  hasPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/features/finance/auth/reminder', () => ({
  applyReminderSchedule: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/uiPreferences', () => {
  const store = new Map<string, string>();
  return {
    getPreference: jest.fn(async (key: string) => store.get(key) ?? null),
    setPreference: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
});

import { SettingsScreen } from '@/features/finance/auth/SettingsScreen';
import {
  resetAnalyticsForTests,
  setAnalyticsProviderFactoryForTests,
  track,
} from '@/services/analytics/analytics.service';
import {
  createFakeAnalyticsProvider,
  type FakeAnalyticsProvider,
} from '@/services/analytics/__fixtures__/fakeAnalyticsProvider';
import { getPreference } from '@/services/uiPreferences';

let fake: FakeAnalyticsProvider;

beforeEach(() => {
  resetAnalyticsForTests();
  fake = createFakeAnalyticsProvider();
  setAnalyticsProviderFactoryForTests(() => fake);
});

afterEach(() => resetAnalyticsForTests());

describe('SettingsScreen — analytics', () => {
  it('shows the switch off until the user turns it on, then starts sending', async () => {
    render(<SettingsScreen />);
    const toggle = await screen.findByTestId('settings-analytics-switch');
    expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ checked: false }));

    await act(async () => {
      fireEvent.press(toggle);
    });

    expect(await getPreference('analytics_consent')).toBe('granted');
    expect(fake.captured.map((e) => e.event)).toEqual(['analytics_enabled']);
  });

  it('stops sending when the user turns it back off', async () => {
    render(<SettingsScreen />);
    const toggle = await screen.findByTestId('settings-analytics-switch');
    await act(async () => {
      fireEvent.press(toggle);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-analytics-switch'));
    });
    track('app_opened', { trigger: 'foreground' });

    expect(await getPreference('analytics_consent')).toBe('denied');
    expect(fake.disableCalls).toBe(1);
    expect(fake.captured.map((e) => e.event)).toEqual(['analytics_enabled']);
  });
});
