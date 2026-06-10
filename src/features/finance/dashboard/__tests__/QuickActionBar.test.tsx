import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { QuickActionBar } from '@/features/finance/dashboard/QuickActionBar';

const NO_ACTIVITY = { hasExpenses: false, zeroDayConfirmed: false };
const HAS_EXPENSES = { hasExpenses: true, zeroDayConfirmed: false };
const ZERO_DAY_DONE = { hasExpenses: false, zeroDayConfirmed: true };

describe('QuickActionBar', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders Log Expense and Log Income buttons', () => {
    render(<QuickActionBar zeroDay={NO_ACTIVITY} onConfirmZeroDay={jest.fn()} />);
    expect(screen.getByTestId('quick-log-expense')).toBeTruthy();
    expect(screen.getByTestId('quick-log-income')).toBeTruthy();
  });

  it('navigates to /expenses/log when Log Expense is pressed', () => {
    render(<QuickActionBar zeroDay={NO_ACTIVITY} onConfirmZeroDay={jest.fn()} />);
    fireEvent.press(screen.getByTestId('quick-log-expense'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/log');
  });

  it('navigates to /income/log when Log Income is pressed', () => {
    render(<QuickActionBar zeroDay={NO_ACTIVITY} onConfirmZeroDay={jest.fn()} />);
    fireEvent.press(screen.getByTestId('quick-log-income'));
    expect(mockPush).toHaveBeenCalledWith('/income/log');
  });

  it('shows Confirm Zero Day when the day has no activity', () => {
    render(<QuickActionBar zeroDay={NO_ACTIVITY} onConfirmZeroDay={jest.fn()} />);
    expect(screen.getByTestId('quick-confirm-zero-day')).toBeTruthy();
  });

  it('fires onConfirmZeroDay when Confirm Zero Day is pressed', () => {
    const onConfirm = jest.fn();
    render(<QuickActionBar zeroDay={NO_ACTIVITY} onConfirmZeroDay={onConfirm} />);
    fireEvent.press(screen.getByTestId('quick-confirm-zero-day'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('hides Confirm Zero Day when the day already has expenses', () => {
    render(<QuickActionBar zeroDay={HAS_EXPENSES} onConfirmZeroDay={jest.fn()} />);
    expect(screen.queryByTestId('quick-confirm-zero-day')).toBeNull();
  });

  it('hides Confirm Zero Day when zero day is already confirmed', () => {
    render(<QuickActionBar zeroDay={ZERO_DAY_DONE} onConfirmZeroDay={jest.fn()} />);
    expect(screen.queryByTestId('quick-confirm-zero-day')).toBeNull();
  });
});
