import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { PlannedItem } from '@/features/finance/planned/planned.types';
import i18n from '@/i18n';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

// Pin today so the due badges read the same on any day the suite runs.
jest.mock('@/features/finance/planned/planned.due', () => ({
  ...jest.requireActual('@/features/finance/planned/planned.due'),
  todayISO: () => '2026-10-04',
}));

jest.mock('@/features/finance/planned/planned.hooks', () => ({
  usePlannedItems: jest.fn(),
}));

jest.mock('@/features/finance/expenses/expenses.hooks', () => ({
  useCategories: () => ({ displayLabelFor: () => 'Food' }),
}));
jest.mock('@/features/finance/expenses/CategoryPicker', () => ({ CategoryPicker: () => null }));
jest.mock('@/features/finance/accounts/AccountPicker', () => ({ AccountPicker: () => null }));
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

function setup(items: PlannedItem[], listDueDate: string | null) {
  const state = {
    setDueDate: jest.fn().mockResolvedValue(true),
    postpone: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
  };
  mockedUsePlannedItems.mockReturnValue({
    listName: 'Saturday market',
    listDueDate,
    items,
    loading: false,
    error: null,
    refresh: jest.fn(),
    clearError: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    buy: jest.fn(),
    unbuy: jest.fn(),
    removeList: jest.fn(),
    ...state,
  });
  return state;
}

/** Opens the date picker behind `testID` and picks `date`, letting the save settle. */
async function pickDate(testID: string, date: Date) {
  fireEvent.press(screen.getByTestId(testID));
  await act(async () => {
    fireEvent(screen.getByTestId('date-picker'), 'onChange', { type: 'set' }, date);
  });
}

beforeEach(() => jest.clearAllMocks());

describe('PlannedListScreen — shopping day', () => {
  it("shows the list's shopping day and moves it", async () => {
    const state = setup([RICE], '2026-10-10');
    render(<PlannedListScreen listId={7} />);

    await pickDate('planned-list-due', new Date(2026, 9, 17));

    expect(state.setDueDate).toHaveBeenCalledWith('2026-10-17');
  });

  it('asks for a shopping day on a list made before due dates', async () => {
    const state = setup([RICE], null);
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByText('Set the day you plan to shop to get a reminder.')).toBeTruthy();
    await pickDate('planned-list-due', new Date(2026, 9, 11));
    expect(state.setDueDate).toHaveBeenCalledWith('2026-10-11');
  });
});

describe('PlannedListScreen — item due badges', () => {
  it('warns on an item due within three days', () => {
    setup([RICE], '2026-10-06');
    render(<PlannedListScreen listId={7} />);
    expect(screen.getByTestId('planned-due-1')).toHaveTextContent('Due in 2 days');
  });

  it('keeps an item quiet while its date is still far off', () => {
    setup([RICE], '2026-10-30');
    render(<PlannedListScreen listId={7} />);
    expect(screen.queryByTestId('planned-due-1')).toBeNull();
    expect(screen.queryByTestId('planned-postpone-1')).toBeNull();
  });

  it("shows an item's own date when it differs from the list's", () => {
    setup([{ ...RICE, plannedDate: '2026-10-20' }], '2026-10-30');
    render(<PlannedListScreen listId={7} />);
    expect(screen.getByTestId('planned-due-1')).toHaveTextContent('Due 20 October 2026');
  });

  it('never flags a bought item', () => {
    setup([{ ...RICE, isBought: true, expenseId: 3, boughtAmount: 5000 }], '2026-10-01');
    render(<PlannedListScreen listId={7} />);
    expect(screen.queryByTestId('planned-due-1')).toBeNull();
    expect(screen.queryByTestId('planned-postpone-1')).toBeNull();
  });
});

describe('PlannedListScreen — postpone', () => {
  it('postpones an overdue item by a week', async () => {
    const state = setup([RICE], '2026-10-01');
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByTestId('planned-due-1')).toHaveTextContent('Overdue by 3 days');
    fireEvent.press(screen.getByTestId('planned-postpone-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('postpone-week'));
    });

    expect(state.postpone).toHaveBeenCalledWith(RICE, 7);
  });

  it('postpones an item due today by a day', async () => {
    const state = setup([RICE], '2026-10-04');
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-postpone-1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('postpone-day'));
    });

    expect(state.postpone).toHaveBeenCalledWith(RICE, 1);
  });

  it('moves an item to a picked date', async () => {
    const state = setup([RICE], '2026-10-05');
    render(<PlannedListScreen listId={7} />);

    fireEvent.press(screen.getByTestId('planned-postpone-1'));
    await pickDate('postpone-date', new Date(2026, 9, 24));

    expect(state.update).toHaveBeenCalledWith(1, { plannedDate: '2026-10-24' });
  });

  it('reads in French', async () => {
    setup([RICE], '2026-10-01');
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<PlannedListScreen listId={7} />);

    expect(screen.getByTestId('planned-due-1')).toHaveTextContent('En retard de 3 jours');
    expect(screen.getByText('Reporter')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
