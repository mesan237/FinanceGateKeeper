import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import type { PlannedItem } from '@/features/finance/planned/planned.types';
import i18n from '@/i18n';
import { groupDigits } from '@/utils/groupDigits';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/finance/planned/planned.hooks', () => ({
  usePlannedItems: jest.fn(),
}));

jest.mock('@/features/finance/expenses/expenses.hooks', () => ({
  useCategories: () => ({ displayLabelFor: (id: number) => (id === 1 ? 'Food' : 'Transport') }),
}));

// The pickers have their own tests; here they are stubs that pick fixed values.
jest.mock('@/features/finance/expenses/CategoryPicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    CategoryPicker: ({
      visible,
      onSelect,
    }: {
      visible: boolean;
      onSelect: (s: { categoryId: number; subcategoryId: null; label: string }) => void;
    }) =>
      visible ? (
        <Pressable
          testID="category-stub"
          onPress={() => onSelect({ categoryId: 1, subcategoryId: null, label: 'Food' })}
        >
          <Text>pick Food</Text>
        </Pressable>
      ) : null,
  };
});
jest.mock('@/features/finance/accounts/AccountPicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    AccountPicker: ({ testID, onChange }: { testID?: string; onChange: (id: number) => void }) => (
      <Pressable testID={testID} onPress={() => onChange(2)}>
        <Text>pick MoMo</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/features/finance/accounts/accounts.hooks', () => ({
  useDefaultAccountId: () => 1,
}));

import { PlannedListScreen } from '@/features/finance/planned/PlannedListScreen';
import { usePlannedItems } from '@/features/finance/planned/planned.hooks';

const mockedUsePlannedItems = usePlannedItems as jest.MockedFunction<typeof usePlannedItems>;

const RICE: PlannedItem = {
  id: 1,
  listId: 7,
  name: 'Rice',
  estimatedAmount: 5000,
  categoryId: 1,
  accountId: null,
  plannedDate: null,
  expenseId: null,
  isBought: false,
  boughtAmount: null,
  createdAt: '2026-09-30T00:00:00.000Z',
};
const OIL_BOUGHT: PlannedItem = {
  ...RICE,
  id: 2,
  name: 'Oil',
  estimatedAmount: 2500,
  expenseId: 40,
  isBought: true,
  boughtAmount: 2300,
};

interface HookState {
  items: PlannedItem[];
  buy: jest.Mock;
  unbuy: jest.Mock;
  add: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  removeList: jest.Mock;
}

function setup(items: PlannedItem[], error: string | null = null): HookState {
  const state = {
    items,
    buy: jest.fn().mockResolvedValue(true),
    unbuy: jest.fn().mockResolvedValue(true),
    add: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    remove: jest.fn().mockResolvedValue(true),
    removeList: jest.fn().mockResolvedValue(true),
  };
  mockedUsePlannedItems.mockReturnValue({
    listName: 'Saturday market',
    loading: false,
    error,
    refresh: jest.fn(),
    clearError: jest.fn(),
    ...state,
  });
  return state;
}

beforeEach(() => jest.clearAllMocks());

describe('PlannedListScreen', () => {
  it('shows the list name, each item with its estimate, and the amount left to buy', () => {
    setup([RICE, OIL_BOUGHT]);
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByText('Saturday market')).toBeTruthy();
    expect(screen.getByText('Rice')).toBeTruthy();
    expect(screen.getByText('Est. 5 000 FCFA')).toBeTruthy();
    expect(screen.getByText('Left to buy: 5 000 FCFA')).toBeTruthy();
  });

  it('strikes a bought item through and shows what was actually paid', () => {
    setup([RICE, OIL_BOUGHT]);
    render(<PlannedListScreen listId={7} />);

    const name = StyleSheet.flatten(screen.getByText('Oil').props.style);
    expect(name.textDecorationLine).toBe('line-through');
    expect(screen.getByText('Paid 2 300 FCFA')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('Rice').props.style).textDecorationLine).not.toBe(
      'line-through',
    );
  });

  it('keeps the price paid readable: only the name is struck through', () => {
    setup([OIL_BOUGHT]);
    render(<PlannedListScreen listId={7} />);

    const amount = StyleSheet.flatten(screen.getByText('Paid 2 300 FCFA').props.style);
    expect(amount?.textDecorationLine).not.toBe('line-through');
  });

  it('marks only bought items as checked', () => {
    setup([RICE, OIL_BOUGHT]);
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByTestId('planned-check-1').props.accessibilityState).toMatchObject({
      checked: false,
    });
    expect(screen.getByTestId('planned-check-2').props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('shows an empty state with an action when nothing is planned', () => {
    setup([]);
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByText('Nothing planned yet')).toBeTruthy();
    expect(screen.getByTestId('planned-add-item')).toBeTruthy();
  });

  it('opens the purchase sheet prefilled with the estimate when an item is ticked', () => {
    setup([RICE]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));

    expect(screen.getByText('Record purchase')).toBeTruthy();
    expect(screen.getByTestId('purchase-amount').props.value).toBe(groupDigits('5000'));
  });

  it('records the expense with the amount the user confirmed, not the estimate', async () => {
    const state = setup([RICE]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    fireEvent.changeText(screen.getByTestId('purchase-amount'), '4800');
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    expect(state.buy).toHaveBeenCalledWith(1, {
      amount: 4800,
      accountId: 1,
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('lets the user pick another account on the purchase sheet', async () => {
    const state = setup([RICE]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    fireEvent.press(screen.getByTestId('purchase-account'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    expect(state.buy).toHaveBeenCalledWith(1, expect.objectContaining({ accountId: 2 }));
  });

  it("prefers the item's own account over the default wallet", async () => {
    const state = setup([{ ...RICE, accountId: 3 }]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    expect(state.buy).toHaveBeenCalledWith(1, expect.objectContaining({ accountId: 3 }));
  });

  it('does not record anything when the amount is cleared', async () => {
    const state = setup([RICE]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    fireEvent.changeText(screen.getByTestId('purchase-amount'), '');
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    expect(state.buy).not.toHaveBeenCalled();
    expect(screen.getByTestId('purchase-amount-error')).toBeTruthy();
  });

  it('records the purchase once when the confirm button is pressed twice quickly', async () => {
    const state = setup([RICE]);
    state.buy.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 20)));
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    expect(state.buy).toHaveBeenCalledTimes(1);
  });

  it('shows why a purchase failed and keeps the sheet open', async () => {
    const state = setup([RICE], 'Could not record the purchase.');
    state.buy.mockResolvedValue(false);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    expect(screen.getByTestId('purchase-confirm')).toBeTruthy();
    expect(screen.getByTestId('purchase-error')).toHaveTextContent('Could not record the purchase.');
  });

  it('shows why an item could not be saved and keeps the sheet open', async () => {
    const state = setup([], 'Failed to save.');
    state.add.mockResolvedValue(false);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-add-item'));
    fireEvent.changeText(screen.getByTestId('item-name'), 'Rice');
    fireEvent.changeText(screen.getByTestId('item-amount'), '5000');
    fireEvent.press(screen.getByTestId('item-category'));
    fireEvent.press(screen.getByTestId('category-stub'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('item-save'));
    });

    expect(screen.getByTestId('item-save')).toBeTruthy();
    expect(screen.getByTestId('item-error')).toHaveTextContent('Failed to save.');
  });

  it('closes the purchase sheet after the expense is recorded', async () => {
    setup([RICE]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('purchase-confirm'));
    });

    await waitFor(() => expect(screen.queryByTestId('purchase-confirm')).toBeNull());
  });

  it('asks before undoing a purchase, then deletes the expense', async () => {
    const state = setup([OIL_BOUGHT]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-2'));
    expect(screen.getByText('Undo this purchase?')).toBeTruthy();
    expect(state.unbuy).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByTestId('undo-confirm'));
    });

    expect(state.unbuy).toHaveBeenCalledWith(2);
  });

  it('keeps the purchase when the undo is cancelled', () => {
    const state = setup([OIL_BOUGHT]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-check-2'));
    fireEvent.press(screen.getByTestId('undo-cancel'));

    expect(state.unbuy).not.toHaveBeenCalled();
    expect(screen.queryByText('Undo this purchase?')).toBeNull();
  });

  it('adds an item through the item sheet', async () => {
    const state = setup([]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-add-item'));
    fireEvent.changeText(screen.getByTestId('item-name'), 'Rice');
    fireEvent.changeText(screen.getByTestId('item-amount'), '5000');
    fireEvent.press(screen.getByTestId('item-category'));
    fireEvent.press(screen.getByTestId('category-stub'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('item-save'));
    });

    expect(state.add).toHaveBeenCalledWith({
      name: 'Rice',
      estimatedAmount: 5000,
      categoryId: 1,
      accountId: null,
      plannedDate: null,
    });
  });

  it('does not add an item without a name, amount and category', async () => {
    const state = setup([]);
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-add-item'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('item-save'));
    });

    expect(state.add).not.toHaveBeenCalled();
    expect(screen.getByTestId('item-name-error')).toBeTruthy();
    expect(screen.getByTestId('item-amount-error')).toBeTruthy();
    expect(screen.getByTestId('item-category-error')).toBeTruthy();
  });

  it('deletes an item', async () => {
    const state = setup([RICE]);
    render(<PlannedListScreen listId={7} />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('planned-delete-1'));
    });

    expect(state.remove).toHaveBeenCalledWith(1);
  });

  it('reads in French, including the purchase sheet', async () => {
    setup([RICE, OIL_BOUGHT]);
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByText('Reste à acheter : 5 000 FCFA')).toBeTruthy();
    expect(screen.getByText('Payé 2 300 FCFA')).toBeTruthy();
    fireEvent.press(screen.getByTestId('planned-check-1'));
    expect(screen.getByText("Enregistrer l'achat")).toBeTruthy();
    expect(screen.getByText('Enregistrer la dépense')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
