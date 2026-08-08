import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

const mockCheck = jest.fn();
jest.mock('@/features/finance/budget/budget.hooks', () => ({
  useOverBudgetCheck: () => ({ check: mockCheck }),
}));

// The per-category envelope guard (VS-33) runs before the month-wide one; when
// it reports "not over" the save falls through to `mockCheck`.
const mockCategoryCheck = jest.fn();
jest.mock('@/features/finance/budget/budget.envelope.hooks', () => ({
  useCategoryOverBudgetCheck: () => ({ check: mockCategoryCheck }),
}));


jest.mock('@/features/finance/expenses/expenses.service', () => ({
  createExpense: jest.fn().mockResolvedValue(1),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true },
    { id: 2, name: 'Restaurant', parentId: 1, isDefault: true },
  ]),
}));

import { ExpenseLogScreen } from '@/features/finance/expenses/ExpenseLogScreen';
import { createExpense, getAllCategories } from '@/features/finance/expenses/expenses.service';

const mockedCreate = createExpense as jest.MockedFunction<typeof createExpense>;
const mockedGetAll = getAllCategories as jest.MockedFunction<typeof getAllCategories>;

const NOT_OVER = { isOver: false, overage: 0, remaining: 0, expenseBudget: 0 };
const over = (overage: number) => ({ isOver: true, overage, remaining: 0, expenseBudget: 0 });

const CATEGORY_NOT_OVER = {
  ...NOT_OVER,
  categoryId: 1,
  categoryName: 'Food',
  hasBudget: false,
};
const categoryOver = (overage: number) => ({
  ...over(overage),
  categoryId: 1,
  categoryName: 'Food',
  hasBudget: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCheck.mockResolvedValue(NOT_OVER);
  mockCategoryCheck.mockResolvedValue(CATEGORY_NOT_OVER);
});

async function selectFoodRestaurant() {
  fireEvent.press(screen.getByText('Select category'));
  fireEvent.press(await screen.findByText('Food'));
  fireEvent.press(await screen.findByText('Restaurant'));
}

describe('ExpenseLogScreen', () => {
  it('renders the amount field, category trigger, note field, and save button', async () => {
    render(<ExpenseLogScreen />);
    expect(screen.getByLabelText('Amount in FCFA')).toBeTruthy();
    expect(screen.getByText('Select category')).toBeTruthy();
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    // Flush the async category load so its state update settles inside act().
    await waitFor(() => expect(mockedGetAll).toHaveBeenCalled());
  });

  it('keeps save disabled until an amount and a category are set', async () => {
    render(<ExpenseLogScreen />);
    const save = screen.getByRole('button', { name: 'Save' });

    expect(save).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');
    expect(save).toBeDisabled(); // amount set, but no category yet

    await selectFoodRestaurant();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('calls createExpense once with the entered values on save', async () => {
    render(<ExpenseLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1500,
        categoryId: 1,
        subcategoryId: 2,
        isRecurring: false,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/transactions'));
  });

  it('runs the over-budget check against the entered amount and skips the modal when within budget', async () => {
    render(<ExpenseLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCheck).toHaveBeenCalledWith(1500));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('over-budget-proceed')).toBeNull();
  });

  it('shows the over-budget modal and does not save until Proceed', async () => {
    mockCheck.mockResolvedValue(over(3000));
    render(<ExpenseLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '8000');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    // Modal appears; nothing saved yet.
    await waitFor(() => expect(screen.getByTestId('over-budget-proceed')).toBeTruthy());
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(screen.getByText(/3 000 FCFA/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('over-budget-proceed'));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/transactions'));
  });

  it('checks the chosen category envelope, not just the month total', async () => {
    render(<ExpenseLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '1500');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCategoryCheck).toHaveBeenCalledWith(1, 1500));
  });

  it('names the category when its envelope is the one being broken', async () => {
    mockCategoryCheck.mockResolvedValue(categoryOver(3000));
    render(<ExpenseLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '8000');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(
        screen.getByText('This expense puts you 3 000 FCFA over your Food budget.'),
      ).toBeTruthy(),
    );
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('prefers the category warning over the month-wide one when both would fire', async () => {
    mockCategoryCheck.mockResolvedValue(categoryOver(3000));
    mockCheck.mockResolvedValue(over(50_000));
    render(<ExpenseLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '8000');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    // The specific envelope is the actionable one, so the month-wide check is
    // never even reached.
    await waitFor(() => expect(screen.getByTestId('over-budget-proceed')).toBeTruthy());
    expect(screen.getByText(/over your Food budget/)).toBeTruthy();
    expect(mockCheck).not.toHaveBeenCalled();
  });

  it('Cancel on the over-budget modal saves nothing', async () => {
    mockCheck.mockResolvedValue(over(3000));
    render(<ExpenseLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '8000');
    await selectFoodRestaurant();

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByTestId('over-budget-cancel')).toBeTruthy());

    fireEvent.press(screen.getByTestId('over-budget-cancel'));

    expect(mockedCreate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('over-budget-proceed')).toBeNull());
  });
});
