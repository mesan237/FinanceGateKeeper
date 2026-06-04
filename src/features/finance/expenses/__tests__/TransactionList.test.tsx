import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Expense } from '@/features/finance/expenses/expenses.types';

const FOOD_BIG: Expense = {
  id: 10,
  amount: 2000,
  categoryId: 1,
  subcategoryId: 2,
  note: null,
  date: '2026-06-20',
  isRecurring: false,
  createdAt: '2026-06-20T00:00:00.000Z',
};
const TRANSPORT: Expense = {
  id: 11,
  amount: 1500,
  categoryId: 3,
  subcategoryId: 4,
  note: null,
  date: '2026-06-10',
  isRecurring: false,
  createdAt: '2026-06-10T00:00:00.000Z',
};
const FOOD_SMALL: Expense = {
  id: 12,
  amount: 500,
  categoryId: 1,
  subcategoryId: null,
  note: null,
  date: '2026-06-01',
  isRecurring: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getAllExpenses: jest.fn(),
  getExpensesByCategory: jest.fn(),
  getExpensesByDateRange: jest.fn(),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true },
    { id: 2, name: 'Restaurant', parentId: 1, isDefault: true },
    { id: 3, name: 'Transport', parentId: null, isDefault: true },
    { id: 4, name: 'Taxi', parentId: 3, isDefault: true },
  ]),
}));

import { TransactionList } from '@/features/finance/expenses/TransactionList';
import {
  getAllExpenses,
  getExpensesByCategory,
} from '@/features/finance/expenses/expenses.service';

const mockedGetAll = getAllExpenses as jest.MockedFunction<typeof getAllExpenses>;
const mockedByCategory = getExpensesByCategory as jest.MockedFunction<
  typeof getExpensesByCategory
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TransactionList', () => {
  it('renders one row per expense, newest-first as returned by the service', async () => {
    mockedGetAll.mockResolvedValue([FOOD_BIG, TRANSPORT, FOOD_SMALL]);
    render(<TransactionList />);

    await screen.findByText('2 000 FCFA');
    const amounts = screen.getAllByText(/FCFA/).map((node) => node.props.children);
    expect(amounts).toEqual(['2 000 FCFA', '1 500 FCFA', '500 FCFA']);
  });

  it('labels a row with the subcategory name, falling back to the parent', async () => {
    mockedGetAll.mockResolvedValue([FOOD_BIG, FOOD_SMALL]);
    render(<TransactionList />);

    expect(await screen.findByText('Restaurant · 20 Jun')).toBeTruthy(); // subcategory
    expect(screen.getByText('Food · 1 Jun')).toBeTruthy(); // parent fallback
  });

  it('hides non-matching rows when filtered by category', async () => {
    mockedGetAll.mockResolvedValue([FOOD_BIG, TRANSPORT, FOOD_SMALL]);
    mockedByCategory.mockResolvedValue([FOOD_BIG, FOOD_SMALL]);
    render(<TransactionList />);

    await screen.findByText('Taxi · 10 Jun');

    fireEvent.press(screen.getByRole('button', { name: 'Food' }));

    await waitFor(() => expect(mockedByCategory).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Taxi · 10 Jun')).toBeNull());
    expect(screen.getByText('2 000 FCFA')).toBeTruthy();
  });

  it('shows the empty state when no expenses match', async () => {
    mockedGetAll.mockResolvedValue([]);
    render(<TransactionList />);

    expect(await screen.findByText('No transactions yet.')).toBeTruthy();
  });
});
