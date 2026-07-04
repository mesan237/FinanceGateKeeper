import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/auth/auth.service', () => ({
  getAppSettings: jest.fn(),
  isMonth1Complete: jest.fn(),
  setAppMode: jest.fn().mockResolvedValue(undefined),
  setReminderTime: jest.fn().mockResolvedValue(undefined),
  setNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
  getActionBarStyle: jest.fn().mockResolvedValue('explicit'),
  setActionBarStyle: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/finance/auth/reminder', () => ({
  applyReminderSchedule: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

const mockCloud: {
  userEmail: string | null;
  signedIn: boolean;
  status: 'idle' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  syncNow: jest.Mock;
} = {
  userEmail: null,
  signedIn: false,
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  signIn: jest.fn().mockResolvedValue(true),
  signUp: jest.fn().mockResolvedValue(true),
  signOut: jest.fn().mockResolvedValue(undefined),
  syncNow: jest.fn().mockResolvedValue(undefined),
};
jest.mock('@/hooks/useCloudSync', () => ({ useCloudSync: () => mockCloud }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

import * as SecureStore from 'expo-secure-store';

import { ThemeProvider } from '@/theme';
import { AppModeProvider } from '@/features/finance/auth/AppModeProvider';
import { SettingsScreen } from '@/features/finance/auth/SettingsScreen';
import {
  getAppSettings,
  isMonth1Complete,
  setAppMode,
  setReminderTime,
} from '@/features/finance/auth/auth.service';
import { applyReminderSchedule } from '@/features/finance/auth/reminder';

const mockedGet = getAppSettings as jest.MockedFunction<typeof getAppSettings>;
const mockedMonth1 = isMonth1Complete as jest.MockedFunction<typeof isMonth1Complete>;
const mockedSetMode = setAppMode as jest.MockedFunction<typeof setAppMode>;
const mockedSetTime = setReminderTime as jest.MockedFunction<typeof setReminderTime>;
const mockedApply = applyReminderSchedule as jest.MockedFunction<typeof applyReminderSchedule>;

function renderSettings() {
  return render(
    <AppModeProvider>
      <SettingsScreen />
    </AppModeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue({
    appMode: 'learning',
    reminderTime: '21:00',
    notificationsEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    onboardingComplete: true,
  });
  mockedMonth1.mockResolvedValue(false);
  mockCloud.userEmail = null;
  mockCloud.signedIn = false;
  mockCloud.status = 'idle';
  mockCloud.lastSyncedAt = null;
  mockCloud.error = null;
});

describe('SettingsScreen', () => {
  it('renders the controls seeded from settings', async () => {
    renderSettings();
    expect(await screen.findByTestId('settings-mode-toggle')).toBeTruthy();
    expect(screen.getByTestId('settings-reminder-input').props.value).toBe('21:00');
    expect(screen.getByTestId('settings-notifications-switch').props.value).toBe(true);
  });

  it('saves a changed reminder time and reschedules', async () => {
    renderSettings();
    fireEvent.changeText(await screen.findByTestId('settings-reminder-input'), '07:30');
    fireEvent.press(screen.getByTestId('settings-reminder-save'));

    await waitFor(() => expect(mockedSetTime).toHaveBeenCalledWith('07:30'));
    expect(mockedApply).toHaveBeenCalledWith(
      expect.objectContaining({ reminderTime: '07:30', notificationsEnabled: true }),
    );
  });

  it('toggles app mode', async () => {
    renderSettings();
    fireEvent.press(await screen.findByTestId('settings-mode-toggle'));
    await waitFor(() => expect(mockedSetMode).toHaveBeenCalledWith('control'));
  });

  it('renders the appearance control', async () => {
    renderSettings();
    expect(await screen.findByTestId('settings-theme-control')).toBeTruthy();
  });

  it('persists the chosen theme when a segment is tapped', async () => {
    render(
      <ThemeProvider>
        <AppModeProvider>
          <SettingsScreen />
        </AppModeProvider>
      </ThemeProvider>,
    );
    fireEvent.press(await screen.findByTestId('settings-theme-control-dark'));
    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('theme-mode', 'dark'),
    );
  });

  it('shows the control-mode suggestion only after month 1 in learning mode', async () => {
    mockedMonth1.mockResolvedValue(true);
    renderSettings();
    expect(await screen.findByTestId('settings-control-suggestion')).toBeTruthy();
  });

  it('hides the suggestion within month 1', async () => {
    mockedMonth1.mockResolvedValue(false);
    renderSettings();
    await screen.findByTestId('settings-mode-toggle');
    expect(screen.queryByTestId('settings-control-suggestion')).toBeNull();
  });
});

describe('SettingsScreen — Cloud Backup', () => {
  it('shows email/password inputs and sign-in when signed out', async () => {
    renderSettings();
    expect(await screen.findByTestId('settings-cloud-email')).toBeTruthy();
    expect(screen.getByTestId('settings-cloud-password')).toBeTruthy();
    expect(screen.getByTestId('settings-sign-in')).toBeTruthy();
    expect(screen.queryByTestId('settings-sync-now')).toBeNull();
  });

  it('shows the account email, Sync Now, and Sign Out when signed in', async () => {
    mockCloud.signedIn = true;
    mockCloud.userEmail = 'me@example.com';
    renderSettings();
    expect(await screen.findByText('me@example.com')).toBeTruthy();
    expect(screen.getByTestId('settings-sync-now')).toBeTruthy();
    expect(screen.getByTestId('settings-sign-out')).toBeTruthy();
    expect(screen.queryByTestId('settings-sign-in')).toBeNull();
  });

  it('runs sync when Sync Now is pressed', async () => {
    mockCloud.signedIn = true;
    mockCloud.userEmail = 'me@example.com';
    renderSettings();
    fireEvent.press(await screen.findByTestId('settings-sync-now'));
    await waitFor(() => expect(mockCloud.syncNow).toHaveBeenCalled());
  });

  it('signs in with the entered credentials', async () => {
    renderSettings();
    fireEvent.changeText(await screen.findByTestId('settings-cloud-email'), 'me@example.com');
    fireEvent.changeText(screen.getByTestId('settings-cloud-password'), 'pw123456');
    fireEvent.press(screen.getByTestId('settings-sign-in'));
    await waitFor(() =>
      expect(mockCloud.signIn).toHaveBeenCalledWith('me@example.com', 'pw123456'),
    );
  });

  it('shows the last-synced timestamp when present', async () => {
    mockCloud.signedIn = true;
    mockCloud.userEmail = 'me@example.com';
    mockCloud.lastSyncedAt = '2026-06-10T08:30:00.000Z';
    renderSettings();
    expect(await screen.findByTestId('settings-last-synced')).toBeTruthy();
  });

  it('shows the error message when sync fails', async () => {
    mockCloud.signedIn = true;
    mockCloud.userEmail = 'me@example.com';
    mockCloud.status = 'error';
    mockCloud.error = 'network down';
    renderSettings();
    expect(await screen.findByText('network down')).toBeTruthy();
  });
});
