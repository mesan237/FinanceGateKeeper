import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

jest.mock('@/features/finance/auth/auth.service', () => ({
  getAppSettings: jest.fn(),
}));
jest.mock('@/features/finance/auth/reminder', () => ({
  applyReminderSchedule: jest.fn(),
}));

import { DailyReminderScheduler } from '@/features/finance/auth/DailyReminderScheduler';
import { getAppSettings } from '@/features/finance/auth/auth.service';
import { applyReminderSchedule } from '@/features/finance/auth/reminder';

const mockedGet = getAppSettings as jest.MockedFunction<typeof getAppSettings>;
const mockedApply = applyReminderSchedule as jest.MockedFunction<typeof applyReminderSchedule>;

const SETTINGS = {
  appMode: 'learning' as const,
  reminderTime: '21:00',
  notificationsEnabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  onboardingComplete: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DailyReminderScheduler', () => {
  it('reconciles the reminder once on mount and renders children', async () => {
    mockedGet.mockResolvedValue(SETTINGS);
    mockedApply.mockResolvedValue(undefined);

    render(
      <DailyReminderScheduler>
        <Text>child content</Text>
      </DailyReminderScheduler>,
    );

    expect(screen.getByText('child content')).toBeTruthy();
    await waitFor(() => expect(mockedApply).toHaveBeenCalledTimes(1));
    expect(mockedApply).toHaveBeenCalledWith(SETTINGS);
  });

  it('still renders children when scheduling throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGet.mockResolvedValue(SETTINGS);
    mockedApply.mockRejectedValue(new Error('no permission'));

    render(
      <DailyReminderScheduler>
        <Text>child content</Text>
      </DailyReminderScheduler>,
    );

    expect(screen.getByText('child content')).toBeTruthy();
    await waitFor(() => expect(mockedApply).toHaveBeenCalledTimes(1));
    errorSpy.mockRestore();
  });
});
