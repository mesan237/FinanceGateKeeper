import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
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

beforeEach(() => {
  jest.clearAllMocks();
});

async function selectFoodRestaurant() {
  fireEvent.press(screen.getByText('Select category'));
  fireEvent.press(await screen.findByText('Food'));
  fireEvent.press(await screen.findByText('Restaurant'));
}

describe('ExpenseLogScreen', () => {
  it('renders the amount field, category trigger, note field, and save button', async () => {
    render(<ExpenseLogScreen />);
    expect(screen.getByLabelText('Amount')).toBeTruthy();
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

    fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
    expect(save).toBeDisabled(); // amount set, but no category yet

    await selectFoodRestaurant();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('calls createExpense once with the entered values on save', async () => {
    render(<ExpenseLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount'), '1500');
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
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/transactions'));
  });
});
