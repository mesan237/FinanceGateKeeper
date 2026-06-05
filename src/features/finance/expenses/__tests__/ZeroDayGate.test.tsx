import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getDayActivityStatus: jest.fn(),
  confirmZeroDay: jest.fn().mockResolvedValue(undefined),
}));

import { ZeroDayGate } from '@/features/finance/expenses/ZeroDayGate';
import { getDayActivityStatus } from '@/features/finance/expenses/expenses.service';

const mockedStatus = getDayActivityStatus as jest.MockedFunction<typeof getDayActivityStatus>;

// 22:00 local — past a 21:00 reminder.
const PAST = new Date(2026, 5, 5, 22, 0, 0);
// 08:00 local — before a 21:00 reminder.
const BEFORE = new Date(2026, 5, 5, 8, 0, 0);

beforeEach(() => {
  jest.clearAllMocks();
});

function renderGate(props: Partial<React.ComponentProps<typeof ZeroDayGate>> = {}) {
  return render(
    <ZeroDayGate reminderTime="21:00" notificationsEnabled now={PAST} {...props}>
      <Text>child content</Text>
    </ZeroDayGate>,
  );
}

describe('ZeroDayGate', () => {
  it('always renders children', async () => {
    mockedStatus.mockResolvedValue({ hasExpenses: false, zeroDayConfirmed: false });
    renderGate();
    expect(screen.getByText('child content')).toBeTruthy();
    await waitFor(() => expect(mockedStatus).toHaveBeenCalled());
  });

  it('shows the prompt past the reminder time with no activity', async () => {
    mockedStatus.mockResolvedValue({ hasExpenses: false, zeroDayConfirmed: false });
    renderGate();
    expect(await screen.findByTestId('zero-day-confirm')).toBeTruthy();
  });

  it('stays hidden when the day already has an expense', async () => {
    mockedStatus.mockResolvedValue({ hasExpenses: true, zeroDayConfirmed: false });
    renderGate();
    await waitFor(() => expect(mockedStatus).toHaveBeenCalled());
    expect(screen.queryByTestId('zero-day-confirm')).toBeNull();
  });

  it('stays hidden when a zero-day is already confirmed', async () => {
    mockedStatus.mockResolvedValue({ hasExpenses: false, zeroDayConfirmed: true });
    renderGate();
    await waitFor(() => expect(mockedStatus).toHaveBeenCalled());
    expect(screen.queryByTestId('zero-day-confirm')).toBeNull();
  });

  it('stays hidden when notifications are disabled', async () => {
    mockedStatus.mockResolvedValue({ hasExpenses: false, zeroDayConfirmed: false });
    renderGate({ notificationsEnabled: false });
    expect(screen.getByText('child content')).toBeTruthy();
    expect(mockedStatus).not.toHaveBeenCalled();
    expect(screen.queryByTestId('zero-day-confirm')).toBeNull();
  });

  it('stays hidden before the reminder time', async () => {
    mockedStatus.mockResolvedValue({ hasExpenses: false, zeroDayConfirmed: false });
    renderGate({ now: BEFORE });
    expect(screen.getByText('child content')).toBeTruthy();
    expect(mockedStatus).not.toHaveBeenCalled();
  });
});
