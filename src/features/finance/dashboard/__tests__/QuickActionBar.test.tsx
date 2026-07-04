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

function renderBar(overrides: Partial<React.ComponentProps<typeof QuickActionBar>> = {}) {
  const props = {
    zeroDay: NO_ACTIVITY,
    onConfirmZeroDay: jest.fn(),
    onLogExpense: jest.fn(),
    onLogIncome: jest.fn(),
    ...overrides,
  };
  render(<QuickActionBar {...props} />);
  return props;
}

describe('QuickActionBar', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders Log Expense and Log Income buttons', () => {
    renderBar();
    expect(screen.getByTestId('quick-log-expense')).toBeTruthy();
    expect(screen.getByTestId('quick-log-income')).toBeTruthy();
  });

  it('fires onLogExpense (no route push) when Log Expense is pressed', () => {
    const props = renderBar();
    fireEvent.press(screen.getByTestId('quick-log-expense'));
    expect(props.onLogExpense).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('fires onLogIncome (no route push) when Log Income is pressed', () => {
    const props = renderBar();
    fireEvent.press(screen.getByTestId('quick-log-income'));
    expect(props.onLogIncome).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows Confirm Zero Day when the day has no activity', () => {
    renderBar();
    expect(screen.getByTestId('quick-confirm-zero-day')).toBeTruthy();
  });

  it('labels the zero-day action in plain language, not "Zero Day" jargon', () => {
    renderBar();
    expect(screen.getByText('No spending')).toBeTruthy();
    expect(screen.queryByText('Zero Day')).toBeNull();
  });

  it('fires onConfirmZeroDay when Confirm Zero Day is pressed', () => {
    const props = renderBar();
    fireEvent.press(screen.getByTestId('quick-confirm-zero-day'));
    expect(props.onConfirmZeroDay).toHaveBeenCalledTimes(1);
  });

  it('hides Confirm Zero Day when the day already has expenses', () => {
    renderBar({ zeroDay: HAS_EXPENSES });
    expect(screen.queryByTestId('quick-confirm-zero-day')).toBeNull();
  });

  it('hides Confirm Zero Day when zero day is already confirmed', () => {
    renderBar({ zeroDay: ZERO_DAY_DONE });
    expect(screen.queryByTestId('quick-confirm-zero-day')).toBeNull();
  });
});
