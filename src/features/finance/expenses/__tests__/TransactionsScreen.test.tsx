import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/services/transactions', () => ({
  getTransactionFeed: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getAllExpenses: jest.fn().mockResolvedValue([]),
  getExpensesByCategory: jest.fn().mockResolvedValue([]),
  getAllCategories: jest.fn().mockResolvedValue([]),
}));

import { TransactionsScreen } from '@/features/finance/expenses/TransactionsScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TransactionsScreen — explicit style', () => {
  it('renders Quick Add compact button and Log Expense primary button, both visible', () => {
    render(<TransactionsScreen actionBarStyle="explicit" />);
    expect(screen.getByRole('button', { name: '+ Log Expense' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quick Add' })).toBeTruthy();
  });

  it('does NOT render a Log Income button', () => {
    render(<TransactionsScreen actionBarStyle="explicit" />);
    expect(screen.queryByRole('button', { name: /log income/i })).toBeNull();
  });

  it('does NOT render Recurring, Debts, or Settings buttons', () => {
    render(<TransactionsScreen actionBarStyle="explicit" />);
    expect(screen.queryByRole('button', { name: /recurring/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /debts/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /settings/i })).toBeNull();
  });

  it('navigates to the quick-add route', () => {
    render(<TransactionsScreen actionBarStyle="explicit" />);
    fireEvent.press(screen.getByRole('button', { name: 'Quick Add' }));
    expect(mockPush).toHaveBeenCalledWith('/expenses/quick-add');
  });

  it('navigates to the log route', () => {
    render(<TransactionsScreen actionBarStyle="explicit" />);
    fireEvent.press(screen.getByRole('button', { name: '+ Log Expense' }));
    expect(mockPush).toHaveBeenCalledWith('/expenses/log');
  });
});

describe('TransactionsScreen — speed_dial style', () => {
  it('renders a single "+" FAB; the two individual buttons are not directly visible', () => {
    render(<TransactionsScreen actionBarStyle="speed_dial" />);
    expect(screen.getByTestId('speed-dial-fab')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quick Add' })).toBeNull();
    expect(screen.queryByRole('button', { name: '+ Log Expense' })).toBeNull();
  });

  it('tapping the "+" FAB reveals Log Expense and Quick Add options', async () => {
    render(<TransactionsScreen actionBarStyle="speed_dial" />);
    fireEvent.press(screen.getByTestId('speed-dial-fab'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Log Expense' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Quick Add' })).toBeTruthy();
    });
  });
});
