import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/auth/auth.service', () => ({
  getAppSettings: jest.fn(),
  isMonth1Complete: jest.fn(),
  setAppMode: jest.fn().mockResolvedValue(undefined),
  setReminderTime: jest.fn().mockResolvedValue(undefined),
  setNotificationsEnabled: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/finance/auth/reminder', () => ({
  applyReminderSchedule: jest.fn().mockResolvedValue(undefined),
}));

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
  });
  mockedMonth1.mockResolvedValue(false);
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
