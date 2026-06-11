import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getExpenseById: jest.fn().mockResolvedValue(null),
  getAllCategories: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/features/finance/budget/budget.hooks', () => ({
  useOverBudgetCheck: () => ({ check: jest.fn().mockResolvedValue({ isOver: false, overage: 0 }) }),
}));

import { ExpenseDetailRoute } from '@/features/finance/expenses/ExpenseDetailRoute';

describe('ExpenseDetailRoute', () => {
  it('renders error state for id = 0', () => {
    mockParams = { id: '0' };
    render(<ExpenseDetailRoute />);
    expect(screen.getByText('Invalid expense id.')).toBeTruthy();
  });

  it('renders error state for a non-numeric param', () => {
    mockParams = { id: 'abc' };
    render(<ExpenseDetailRoute />);
    expect(screen.getByText('Invalid expense id.')).toBeTruthy();
  });

  it('renders ExpenseDetailScreen for a valid positive integer id', () => {
    mockParams = { id: '5' };
    render(<ExpenseDetailRoute />);
    // ExpenseDetailScreen renders the ScreenHeader with title "Edit Expense"
    expect(screen.getByText('Edit Expense')).toBeTruthy();
  });
});
