import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { RecurringExpense } from '@/features/finance/expenses/expenses.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const RENT: RecurringExpense = {
  id: 1,
  label: 'Rent',
  amount: 150000,
  categoryId: 9,
  subcategoryId: null,
  frequency: 'monthly',
  nextDueDate: '2026-07-01',
  isActive: true,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const PHONE: RecurringExpense = {
  id: 2,
  label: 'Phone data',
  amount: 5000,
  categoryId: 9,
  subcategoryId: null,
  frequency: 'weekly',
  nextDueDate: '2026-06-15',
  isActive: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getRecurringExpenses: jest.fn(),
  createRecurringExpense: jest.fn().mockResolvedValue(3),
  updateRecurringExpense: jest.fn().mockResolvedValue(undefined),
  setRecurringActive: jest.fn().mockResolvedValue(undefined),
  skipRecurringOccurrence: jest.fn().mockResolvedValue(undefined),
  deleteRecurringExpense: jest.fn().mockResolvedValue(undefined),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 9, name: 'Bills', parentId: null, isDefault: true, isHidden: false },
  ]),
}));

import { RecurringExpensesScreen } from '@/features/finance/expenses/RecurringExpensesScreen';
import {
  getRecurringExpenses,
  setRecurringActive,
  skipRecurringOccurrence,
} from '@/features/finance/expenses/expenses.service';

const mockedGet = getRecurringExpenses as jest.MockedFunction<typeof getRecurringExpenses>;
const mockedSetActive = setRecurringActive as jest.MockedFunction<typeof setRecurringActive>;
const mockedSkip = skipRecurringOccurrence as jest.MockedFunction<typeof skipRecurringOccurrence>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue([RENT, PHONE]);
});

describe('RecurringExpensesScreen', () => {
  it('renders a row per recurring entry with label, amount and next due date', async () => {
    render(<RecurringExpensesScreen />);
    expect(await screen.findByText('Rent')).toBeTruthy();
    expect(screen.getByText('Phone data')).toBeTruthy();
    expect(screen.getByTestId('recurring-row-1')).toBeTruthy();
    expect(screen.getByTestId('recurring-row-2')).toBeTruthy();
  });

  it('toggles the active flag once when the toggle is pressed', async () => {
    render(<RecurringExpensesScreen />);
    fireEvent.press(await screen.findByTestId('recurring-toggle-1'));

    await waitFor(() => expect(mockedSetActive).toHaveBeenCalledTimes(1));
    expect(mockedSetActive).toHaveBeenCalledWith(1, false);
  });

  it('skips the next occurrence when "Skip next" is pressed', async () => {
    render(<RecurringExpensesScreen />);
    fireEvent.press(await screen.findByTestId('recurring-skip-1'));

    await waitFor(() => expect(mockedSkip).toHaveBeenCalledWith(1));
  });

  it('opens the create modal from "+ Add recurring"', async () => {
    render(<RecurringExpensesScreen />);
    fireEvent.press(await screen.findByTestId('recurring-add-btn'));

    expect(screen.getByTestId('recurring-label-input')).toBeTruthy();
  });
});
