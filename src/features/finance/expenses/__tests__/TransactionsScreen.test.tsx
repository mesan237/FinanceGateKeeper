import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getAllExpenses: jest.fn().mockResolvedValue([]),
  getExpensesByCategory: jest.fn().mockResolvedValue([]),
  getExpensesByDateRange: jest.fn().mockResolvedValue([]),
  getAllCategories: jest.fn().mockResolvedValue([]),
}));

import { TransactionsScreen } from '@/features/finance/expenses/TransactionsScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TransactionsScreen', () => {
  it('renders the primary log CTA plus Quick Add and Recurring links', () => {
    render(<TransactionsScreen />);
    expect(screen.getByRole('button', { name: '+ Log Expense' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quick Add' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recurring' })).toBeTruthy();
  });

  it('navigates to the quick-add route', () => {
    render(<TransactionsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Quick Add' }));
    expect(mockPush).toHaveBeenCalledWith('/expenses/quick-add');
  });

  it('navigates to the recurring route', () => {
    render(<TransactionsScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Recurring' }));
    expect(mockPush).toHaveBeenCalledWith('/expenses/recurring');
  });

  it('navigates to the log route', () => {
    render(<TransactionsScreen />);
    fireEvent.press(screen.getByRole('button', { name: '+ Log Expense' }));
    expect(mockPush).toHaveBeenCalledWith('/expenses/log');
  });
});
