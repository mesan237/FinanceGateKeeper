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
const mockCheckCategory = jest.fn();
jest.mock('@/features/finance/budget/budget.envelope.hooks', () => ({
  useCategoryOverBudgetCheck: () => ({ check: mockCheckCategory }),
}));


// The refunds section has its own tests (ExpenseRefunds.test); these suites are
// about the purchase, so it is stubbed out rather than loading accounts and refunds.
jest.mock('@/features/finance/expenses/ExpenseRefunds', () => ({ ExpenseRefunds: () => null }));

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

// The event picker (VS-61) reads the events list.
jest.mock('@/features/finance/events/events.service', () => ({
  getEvents: jest.fn().mockResolvedValue([
    { id: 3, name: 'Marie’s wedding', date: '2026-11-07', createdAt: '', total: 0, count: 0 },
  ]),
  createEvent: jest.fn(),
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
  isUnplanned: false,
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
  mockCheckCategory.mockResolvedValue({
    ...NOT_OVER,
    categoryId: 0,
    categoryName: '',
    hasBudget: false,
  });
});

describe('ExpenseDetailScreen', () => {
  it('renders with pre-filled amount, category label, note, and date fields', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('2 000')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('lunch')).toBeTruthy();
    expect(screen.getByTestId('expense-date')).toBeTruthy();
    // Categories load separately from the expense, so the label can land later.
    expect(await screen.findByText('Food')).toBeTruthy();
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

  it('shows the stored imprévu flag on the Unplanned switch', async () => {
    mockGetExpenseById.mockResolvedValue({ ...STORED_EXPENSE, isUnplanned: true });
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Unexpected' })).toBeChecked(),
    );
  });

  it('marks an existing expense as an imprévu on save', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);
    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());

    fireEvent.press(screen.getByRole('switch', { name: 'Unexpected' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateExpense).toHaveBeenCalledTimes(1));
    expect(mockUpdateExpense).toHaveBeenCalledWith(5, { isUnplanned: true });
  });

  it("asks both budget checks about the increase only, in the expense's own month (VS-40)", async () => {
    render(<ExpenseDetailScreen expenseId={5} />);

    await waitFor(() => expect(screen.getByDisplayValue('2 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '5000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateExpense).toHaveBeenCalledTimes(1));
    // The stored 2 000 is already counted in June, so only the 3 000 rise is new.
    expect(mockCheckCategory).toHaveBeenCalledWith(1, 3000, '2026-06');
    expect(mockCheck).toHaveBeenCalledWith(3000, '2026-06');
  });

  it('tags an existing expense with the event it was for (VS-61)', async () => {
    render(<ExpenseDetailScreen expenseId={5} />);
    await screen.findByDisplayValue('2 000');

    fireEvent.press(await screen.findByTestId('event-picker-trigger'));
    fireEvent.press(await screen.findByTestId('event-picker-option-3'));
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(mockUpdateExpense).toHaveBeenCalledWith(5, expect.objectContaining({ eventId: 3 })));
  });
});
