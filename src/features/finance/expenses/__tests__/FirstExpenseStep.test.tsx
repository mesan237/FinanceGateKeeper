import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
}));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  createExpense: jest.fn().mockResolvedValue(1),
  getAllCategories: jest.fn(),
  confirmZeroDay: jest.fn().mockResolvedValue(undefined),
  getDayActivityStatus: jest.fn().mockResolvedValue({ hasExpenses: false, zeroDayConfirmed: false }),
}));

import * as accounts from '@/features/finance/accounts/accounts.service';
import type { Account } from '@/features/finance/accounts/accounts.types';
import { FirstExpenseStep } from '@/features/finance/expenses/FirstExpenseStep';
import * as service from '@/features/finance/expenses/expenses.service';
import type { Category } from '@/features/finance/expenses/expenses.types';
import i18n from '@/i18n';

const mocked = service as jest.Mocked<typeof service>;
const mockedAccounts = accounts as jest.Mocked<typeof accounts>;

function category(id: number, name: string): Category {
  return { id, name, parentId: null, isDefault: true, sortOrder: id, isHidden: false, costType: null } as Category;
}

const CATEGORIES = [
  category(1, 'Food'),
  category(2, 'Transport'),
  category(3, 'Bills'),
  category(4, 'Health'),
  category(5, 'Shopping'),
  category(6, 'Other'),
];

const CASH: Account = {
  id: 1,
  name: 'Cash',
  type: 'cash',
  purpose: 'spending',
  openingBalance: 0,
  isDefault: true,
  isActive: true,
  createdAt: '2026-06-01T00:00:00Z',
};
const MTN: Account = { ...CASH, id: 2, name: 'MTN MoMo', type: 'mobile_money', isDefault: false };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllCategories.mockResolvedValue(CATEGORIES);
  mocked.confirmZeroDay.mockResolvedValue(undefined);
  mockedAccounts.getAccounts.mockResolvedValue([MTN, CASH]);
  mockedAccounts.getAccountBalance.mockResolvedValue(0);
});

describe('FirstExpenseStep (VS-92)', () => {
  it('offers four everyday categories, Food already chosen, and Other for the rest', async () => {
    render(<FirstExpenseStep onDone={jest.fn()} />);

    const food = await screen.findByTestId('first-entry-category-1');
    await waitFor(() => expect(food.props.accessibilityState).toEqual(expect.objectContaining({ selected: true })));
    expect(screen.getByText('Transport')).toBeTruthy();
    expect(screen.getByText('Bills')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.queryByText('Shopping')).toBeNull();

    fireEvent.press(screen.getByTestId('first-entry-more'));

    expect(screen.getByText('Shopping')).toBeTruthy();
    expect(screen.queryByTestId('first-entry-more')).toBeNull();
  });

  it('saves the amount, the chosen category and the default wallet, then says it was logged', async () => {
    const onDone = jest.fn();
    render(<FirstExpenseStep onDone={onDone} />);
    fireEvent.press(await screen.findByTestId('first-entry-category-2'));
    await screen.findByText('Cash');

    fireEvent.changeText(screen.getByTestId('first-entry-amount'), '1 500');
    fireEvent.press(screen.getByTestId('first-entry-save'));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('logged'));
    expect(mocked.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1500, categoryId: 2, accountId: CASH.id }),
    );
  });

  // The wallet figures were typed one screen ago, after this purchase was paid.
  it('saves the purchase as already paid, so it does not come off the balance just confirmed', async () => {
    render(<FirstExpenseStep onDone={jest.fn()} />);
    await screen.findByText('Cash');
    fireEvent.changeText(screen.getByTestId('first-entry-amount'), '500');
    fireEvent.press(screen.getByTestId('first-entry-save'));

    await waitFor(() => expect(mocked.createExpense).toHaveBeenCalled());
    const { createdAt } = mocked.createExpense.mock.calls[0][0];
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    expect(createdAt).toBe(midnight.toISOString());
  });

  it('stays on the step and says why when no amount is given', async () => {
    const onDone = jest.fn();
    render(<FirstExpenseStep onDone={onDone} />);
    await screen.findByText('Cash');

    fireEvent.press(screen.getByTestId('first-entry-save'));

    expect(await screen.findByText('Enter an amount greater than 0.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(mocked.createExpense).not.toHaveBeenCalled();
  });

  it('marks a no-spend day', async () => {
    const onDone = jest.fn();
    render(<FirstExpenseStep onDone={onDone} />);

    fireEvent.press(await screen.findByTestId('first-entry-no-spend'));

    await waitFor(() => expect(onDone).toHaveBeenCalledWith('noSpend'));
    expect(mocked.confirmZeroDay).toHaveBeenCalledTimes(1);
  });

  it('shows the error and stays when the day cannot be marked no-spend', async () => {
    mocked.confirmZeroDay.mockRejectedValue(new Error('That day already has spending'));
    const onDone = jest.fn();
    render(<FirstExpenseStep onDone={onDone} />);

    fireEvent.press(await screen.findByTestId('first-entry-no-spend'));

    expect(await screen.findByText('That day already has spending')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('lets the entry wait without writing anything', async () => {
    const onDone = jest.fn();
    render(<FirstExpenseStep onDone={onDone} />);
    fireEvent.changeText(await screen.findByTestId('first-entry-amount'), '500');

    fireEvent.press(screen.getByTestId('first-entry-later'));

    expect(onDone).toHaveBeenCalledWith('later');
    expect(mocked.createExpense).not.toHaveBeenCalled();
    expect(mocked.confirmZeroDay).not.toHaveBeenCalled();
  });

  it('reads in French, naming the seeded cash wallet Espèces', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      render(<FirstExpenseStep onDone={jest.fn()} />);
      expect(await screen.findByText('Espèces')).toBeTruthy();
      expect(screen.getByText('Alimentation')).toBeTruthy();
      expect(screen.getByText('Autre…')).toBeTruthy();
      expect(screen.getByText('Je n’ai rien dépensé aujourd’hui')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
