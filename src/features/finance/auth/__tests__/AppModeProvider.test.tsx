import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

jest.mock('@/features/finance/auth/auth.service', () => ({
  getAppSettings: jest.fn(),
}));

import {
  AppModeProvider,
  useAppMode,
} from '@/features/finance/auth/AppModeProvider';
import { getAppSettings } from '@/features/finance/auth/auth.service';

const mockedGet = getAppSettings as jest.MockedFunction<typeof getAppSettings>;

function Consumer() {
  return <Text>{`mode:${useAppMode()}`}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AppModeProvider / useAppMode', () => {
  it('defaults to learning then reflects the persisted mode', async () => {
    mockedGet.mockResolvedValue({
      appMode: 'control',
      reminderTime: '21:00',
      notificationsEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    render(
      <AppModeProvider>
        <Consumer />
      </AppModeProvider>,
    );

    expect(screen.getByText('mode:learning')).toBeTruthy();
    expect(await screen.findByText('mode:control')).toBeTruthy();
  });

  it('keeps learning when the settings load fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedGet.mockRejectedValue(new Error('db down'));

    render(
      <AppModeProvider>
        <Consumer />
      </AppModeProvider>,
    );

    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1));
    expect(screen.getByText('mode:learning')).toBeTruthy();
    errorSpy.mockRestore();
  });
});
