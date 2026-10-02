import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/auth/auth.service', () => ({
  getAppSettings: jest.fn(),
  setReminderTime: jest.fn().mockResolvedValue(undefined),
  setNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
  getActionBarStyle: jest.fn().mockResolvedValue('explicit'),
  setActionBarStyle: jest.fn().mockResolvedValue(undefined),
  setLanguage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/finance/auth/reminder', () => ({
  applyReminderSchedule: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

import * as SecureStore from 'expo-secure-store';

import { ThemeProvider } from '@/theme';
import { SettingsScreen } from '@/features/finance/auth/SettingsScreen';
import {
  getAppSettings,
  setLanguage,
  setReminderTime,
} from '@/features/finance/auth/auth.service';
import { applyReminderSchedule } from '@/features/finance/auth/reminder';

const mockedGet = getAppSettings as jest.MockedFunction<typeof getAppSettings>;
const mockedSetTime = setReminderTime as jest.MockedFunction<typeof setReminderTime>;
const mockedSetLanguage = setLanguage as jest.MockedFunction<typeof setLanguage>;
const mockedApply = applyReminderSchedule as jest.MockedFunction<typeof applyReminderSchedule>;

function renderSettings() {
  return render(<SettingsScreen />);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue({
    reminderTime: '21:00',
    notificationsEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    onboardingComplete: true,
    language: null,
  });
});

describe('SettingsScreen', () => {
  it('renders the controls seeded from settings', async () => {
    renderSettings();
    // The reminder is a native time picker seeded from the saved HH:mm.
    expect(await screen.findByTestId('settings-reminder-time')).toBeTruthy();
    expect(
      screen.getByTestId('settings-notifications-switch').props.accessibilityState,
    ).toEqual(expect.objectContaining({ checked: true }));
  });

  it('saves a picked reminder time and reschedules — no free-text entry', async () => {
    renderSettings();
    // Open the native picker and pick 07:30.
    fireEvent.press(await screen.findByTestId('settings-reminder-time'));
    fireEvent(screen.getByTestId('time-picker'), 'change', { type: 'set' }, new Date(2020, 0, 1, 7, 30));
    fireEvent.press(screen.getByTestId('settings-reminder-save'));

    await waitFor(() => expect(mockedSetTime).toHaveBeenCalledWith('07:30'));
    expect(mockedApply).toHaveBeenCalledWith(
      expect.objectContaining({ reminderTime: '07:30', notificationsEnabled: true }),
    );
    // The free-text field and its format-error copy are gone.
    expect(screen.queryByTestId('settings-reminder-input')).toBeNull();
    expect(screen.queryByText(/Invalid time/i)).toBeNull();
  });

  it('renders the appearance control', async () => {
    renderSettings();
    expect(await screen.findByTestId('settings-theme-control')).toBeTruthy();
  });

  it('persists the chosen theme when a segment is tapped', async () => {
    render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );
    fireEvent.press(await screen.findByTestId('settings-theme-control-dark'));
    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('theme-mode', 'dark'),
    );
  });
});

describe('SettingsScreen — Language', () => {
  it('follows the device language by default', async () => {
    renderSettings();
    const system = await screen.findByTestId('settings-language-control-system');
    expect(system.props.accessibilityState.selected).toBe(true);
  });

  it('switches the app to French, saves the choice and re-words the reminder', async () => {
    renderSettings();
    fireEvent.press(await screen.findByTestId('settings-language-control-fr'));

    await waitFor(() => expect(mockedSetLanguage).toHaveBeenCalledWith('fr'));
    expect(await screen.findByText('Paramètres')).toBeTruthy();
    expect(mockedApply).toHaveBeenCalledWith(
      expect.objectContaining({ reminderTime: '21:00', notificationsEnabled: true }),
    );
  });

  it('goes back to following the device when System is chosen', async () => {
    mockedGet.mockResolvedValue({
      reminderTime: '21:00',
      notificationsEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      onboardingComplete: true,
      language: 'fr',
    });
    renderSettings();
    fireEvent.press(await screen.findByTestId('settings-language-control-system'));

    await waitFor(() => expect(mockedSetLanguage).toHaveBeenCalledWith(null));
    // The Jest device is English, so following it lands on English.
    expect(await screen.findByText('Settings')).toBeTruthy();
  });
});

describe('SettingsScreen — Cloud Backup', () => {
  it('leaves the cloud account to the Backup & Restore screen', async () => {
    renderSettings();
    await screen.findByTestId('settings-notifications-switch');
    expect(screen.queryByTestId('settings-sign-in')).toBeNull();
    expect(screen.queryByTestId('settings-sync-now')).toBeNull();
    expect(screen.queryByText('Cloud backup')).toBeNull();
  });
});
