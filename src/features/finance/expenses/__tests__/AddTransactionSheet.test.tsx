import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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


jest.mock('@/features/finance/expenses/expenses.service', () => ({
  createExpense: jest.fn().mockResolvedValue(1),
  getQuickAddTemplates: jest.fn().mockResolvedValue([]),
  logFromQuickAddTemplate: jest.fn(),
  createQuickAddTemplate: jest.fn(),
  updateQuickAddTemplate: jest.fn(),
  deleteQuickAddTemplate: jest.fn(),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
    { id: 2, name: 'Restaurant', parentId: 1, isDefault: true, isHidden: false },
  ]),
}));

jest.mock('@/features/finance/income/income.service', () => ({
  createIncome: jest.fn().mockResolvedValue(7),
  getAllIncome: jest.fn().mockResolvedValue([]),
  getIncomeBySource: jest.fn().mockResolvedValue([]),
  getIncomeByDateRange: jest.fn().mockResolvedValue([]),
}));

import { AddTransactionSheet } from '@/features/finance/expenses/AddTransactionSheet';
import { createExpense } from '@/features/finance/expenses/expenses.service';
import { createIncome } from '@/features/finance/income/income.service';

const mockedCreateExpense = createExpense as jest.MockedFunction<typeof createExpense>;
const mockedCreateIncome = createIncome as jest.MockedFunction<typeof createIncome>;

const NOT_OVER = { isOver: false, overage: 0, remaining: 0, expenseBudget: 0 };

function renderSheet(overrides: Partial<React.ComponentProps<typeof AddTransactionSheet>> = {}) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    onSaved: jest.fn(),
    ...overrides,
  };
  render(<AddTransactionSheet {...props} />);
  return props;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheck.mockResolvedValue(NOT_OVER);
});

describe('AddTransactionSheet', () => {
  it('opens on the Expense segment with the three segments available', () => {
    renderSheet();
    expect(screen.getByTestId('add-segment-expense')).toBeTruthy();
    expect(screen.getByTestId('add-segment-income')).toBeTruthy();
    expect(screen.getByTestId('add-segment-templates')).toBeTruthy();
    // Expense panel is active: its amount field is shown.
    expect(screen.getByLabelText('Amount in FCFA')).toBeTruthy();
  });

  it('logs an expense, refreshes the feed, and closes', async () => {
    const props = renderSheet();

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');
    fireEvent.press(screen.getByText('Select category'));
    fireEvent.press(await screen.findByText('Food'));
    fireEvent.press(await screen.findByText('Restaurant'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreateExpense).toHaveBeenCalledTimes(1));
    expect(props.onSaved).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('switches to Income, saves, and closes without an allocation detour (VS-34)', async () => {
    const props = renderSheet();

    fireEvent.press(screen.getByTestId('add-segment-income'));
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '350000');
    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreateIncome).toHaveBeenCalledTimes(1));
    expect(props.onSaved).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/income/allocate' }),
    );
  });

  it('keeps the typed amount when toggling between Expense and Income', () => {
    renderSheet();

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');
    fireEvent.press(screen.getByTestId('add-segment-income'));
    // The income panel mounts with the amount carried over from expense.
    expect(screen.getByLabelText('Amount in FCFA').props.value).toBe('1 500');

    fireEvent.press(screen.getByTestId('add-segment-expense'));
    expect(screen.getByLabelText('Amount in FCFA').props.value).toBe('1 500');
  });

  it('clears the shared amount when the sheet reopens', () => {
    const props = {
      visible: true,
      onClose: jest.fn(),
      onSaved: jest.fn(),
    };
    const { rerender } = render(<AddTransactionSheet {...props} />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');

    rerender(<AddTransactionSheet {...props} visible={false} />);
    rerender(<AddTransactionSheet {...props} visible={true} />);
    expect(screen.getByLabelText('Amount in FCFA').props.value).toBe('');
  });

  it('shows the templates grid on the Templates segment', async () => {
    renderSheet();
    fireEvent.press(screen.getByTestId('add-segment-templates'));
    expect(await screen.findByTestId('quick-add-add-tile')).toBeTruthy();
  });

  it('only autofocuses the amount field on open, not when switching segments back and forth', () => {
    renderSheet();
    expect(screen.getByLabelText('Amount in FCFA').props.autoFocus).toBe(true);

    fireEvent.press(screen.getByTestId('add-segment-income'));
    expect(screen.getByLabelText('Amount in FCFA').props.autoFocus).toBe(false);

    fireEvent.press(screen.getByTestId('add-segment-expense'));
    expect(screen.getByLabelText('Amount in FCFA').props.autoFocus).toBe(false);
  });

  it('routes to the transfer log and closes when the transfer link is pressed (VS-18)', () => {
    const props = renderSheet();
    fireEvent.press(screen.getByTestId('add-transfer-link'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/transfers/log');
  });

  describe('initialSegment (VS-26)', () => {
    it('opens on the Income segment when initialSegment="income"', () => {
      renderSheet({ initialSegment: 'income' });
      // Income panel is active without pressing the segment: its source pills render.
      expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
    });

    it('defaults to the Expense segment when initialSegment is omitted', () => {
      renderSheet();
      expect(screen.getByLabelText('Amount in FCFA')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Salary' })).toBeNull();
    });

    it('reseeds to initialSegment each time the sheet reopens', () => {
      const props = {
        visible: true,
        onClose: jest.fn(),
        onSaved: jest.fn(),
        initialSegment: 'income' as const,
      };
      const { rerender } = render(<AddTransactionSheet {...props} />);
      // Switch away from the seeded segment.
      fireEvent.press(screen.getByTestId('add-segment-expense'));
      expect(screen.queryByRole('button', { name: 'Salary' })).toBeNull();
      // Close then reopen — the effect reseeds to initialSegment.
      rerender(<AddTransactionSheet {...props} visible={false} />);
      rerender(<AddTransactionSheet {...props} visible={true} />);
      expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
    });
  });
});
