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
    onExpenseSaved: jest.fn(),
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
    expect(props.onExpenseSaved).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('switches to Income and routes to allocation after saving', async () => {
    const props = renderSheet();

    fireEvent.press(screen.getByTestId('add-segment-income'));
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '350000');
    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreateIncome).toHaveBeenCalledTimes(1));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/income/allocate' }),
    );
  });

  it('shows the templates grid on the Templates segment', async () => {
    renderSheet();
    fireEvent.press(screen.getByTestId('add-segment-templates'));
    expect(await screen.findByTestId('quick-add-add-tile')).toBeTruthy();
  });

  it('routes to the transfer log and closes when the transfer link is pressed (VS-18)', () => {
    const props = renderSheet();
    fireEvent.press(screen.getByTestId('add-transfer-link'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/transfers/log');
  });
});
