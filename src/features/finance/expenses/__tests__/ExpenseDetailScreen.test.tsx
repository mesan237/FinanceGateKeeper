import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

const mockCheck = jest.fn();
jest.mock('@/features/finance/budget/budget.hooks', () => ({
  useOverBudgetCheck: () => ({ check: mockCheck }),
}));

// The per-category envelope guard (VS-33) runs before the month-wide one.
// These suites exercise the month-wide path, so it always reports "not over"
// and the save falls through to `mockCheck`.
jest.mock('@/features/finance/budget/budget.envelope.hooks', () => ({
  useCategoryOverBudgetCheck: () => ({
    check: jest.fn().mockResolvedValue({
      isOver: false,
      overage: 0,
      remaining: 0,
      expenseBudget: 0,
      categoryId: 0,
      categoryName: '',
      hasBudget: false,
    }),
  }),
}));


const mockGetExpenseById = jest.fn();
const mockUpdateExpense = jest.fn();
const mockDeleteExpense = jest.fn();
const mockGetAllCategories = jest.fn();

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getExpenseById: (...args: unknown[]) => mockGetExpenseById(...args),
  updateExpense: (...args: unknown[]) => mockUpdateExpense(...args),
  deleteExpense: (...args: unknown[]) => mockDeleteExpense(...args),
  getAllCategories: (...args: unknown[]) => mockGetAllCategories(...args),
}));

import { ExpenseDetailScreen } from '@/features/finance/expenses/ExpenseDetailScreen';

const STORED_EXPENSE = {
  id: 5,
  amount: 2000,
  categoryId: 1,
  subcategoryId: null,
  note: 'lunch',
  date: '2026-06-10',
  isRecurring: false,
  createdAt: '2026-06-10T10:00:00.000Z',
};

const CATEGORIES = [
  { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
  { id: 2, name: 'Restaurant', parentId: 1, isDefault: true, isHidden: false },
];

const NOT_OVER = { isOver: false, overage: 0, remaining: 0, expenseBudget: 0 };
const over = (overage: number) => ({ isOver: true, overage, remaining: 0, expenseBudget: 0 });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetExpenseById.mockResolvedValue(STORED_EXPENSE);
  mockUpdateExpense.mockResolvedValue(undefined);
  mockDeleteExpense.mockResolvedValue(undefined);
  mockGetAllCategories.mockResolvedValue(CATEGORIES);
  mockCheck.mockResolvedValue(NOT_OVER);
});

describe('ExpenseDetailScreen', () => {
  it('renders with pre-filled amount, category label, note, and date fields', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2 000')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('lunch')).toBeTruthy();
    expect(screen.getByTestId('expense-date')).toBeTruthy();
    expect(screen.getByText('Food')).toBeTruthy();
  });

  it('uses a back chevron, not a "Cancel" label — it is a drill-down (VS-26 M3)', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('Save button is disabled when amount is cleared', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Save button calls updateExpense with changed fields; navigates back on success', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '2500');

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateExpense).toHaveBeenCalledTimes(1));
    expect(mockUpdateExpense).toHaveBeenCalledWith(5, expect.objectContaining({ amount: 2500 }));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('Delete button opens a confirmation modal showing the confirmation message', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Delete expense' }));

    expect(screen.getByText(/Delete this expense\? This cannot be undone\./)).toBeTruthy();
  });

  it('Confirming deletion calls deleteExpense and navigates back', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Delete expense' }));
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeleteExpense).toHaveBeenCalledWith(5));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('Cancelling the deletion modal closes it without calling deleteExpense', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Delete expense' }));
    fireEvent.press(screen.getByTestId('delete-modal-cancel'));

    await waitFor(() =>
      expect(screen.queryByText(/Delete this expense\? This cannot be undone\./)).toBeNull(),
    );
    expect(mockDeleteExpense).not.toHaveBeenCalled();
  });

  it('over-budget alert is shown when the updated amount exceeds the budget (amount increased)', async () => {
    mockCheck.mockResolvedValue(over(3000));
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '5000');

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByTestId('over-budget-proceed')).toBeTruthy());
    expect(mockUpdateExpense).not.toHaveBeenCalled();
  });

  it('over-budget alert is not shown when the amount is unchanged', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateExpense).toHaveBeenCalledTimes(1));
    expect(mockCheck).not.toHaveBeenCalled();
  });
});
