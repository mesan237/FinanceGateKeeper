import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { PlannedList } from '@/features/finance/planned/planned.types';
import i18n from '@/i18n';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

// Pin today so the due badges read the same on any day the suite runs.
jest.mock('@/features/finance/planned/planned.due', () => ({
  ...jest.requireActual('@/features/finance/planned/planned.due'),
  todayISO: () => '2026-10-04',
}));

jest.mock('@/features/finance/planned/planned.hooks', () => ({
  usePlannedLists: jest.fn(),
}));

import { PlannedListsScreen } from '@/features/finance/planned/PlannedListsScreen';
import { usePlannedLists } from '@/features/finance/planned/planned.hooks';

const mockedUsePlannedLists = usePlannedLists as jest.MockedFunction<typeof usePlannedLists>;

const MARKET: PlannedList = {
  id: 1,
  name: 'Saturday market',
  itemCount: 4,
  openCount: 3,
  openEstimate: 12500,
  dueDate: '2026-10-10',
  // Midday UTC, so the local calendar day is the 30th in any test time zone.
  createdAt: '2026-09-30T12:00:00.000Z',
};
const DONE: PlannedList = {
  ...MARKET,
  id: 2,
  name: 'School',
  itemCount: 2,
  openCount: 0,
  openEstimate: 0,
};
const EMPTY: PlannedList = {
  ...MARKET,
  id: 3,
  name: 'Next week',
  itemCount: 0,
  openCount: 0,
  openEstimate: 0,
};

function setup(lists: PlannedList[]) {
  const create = jest.fn().mockResolvedValue(true);
  mockedUsePlannedLists.mockReturnValue({
    lists,
    loading: false,
    error: null,
    refresh: jest.fn(),
    create,
  });
  return { create };
}

beforeEach(() => jest.clearAllMocks());

/** Opens the due-date picker on the new-list sheet and picks `date`. */
function pickDueDate(date: Date) {
  fireEvent.press(screen.getByTestId('new-list-date'));
  fireEvent(screen.getByTestId('date-picker'), 'onChange', { type: 'set' }, date);
}

describe('PlannedListsScreen', () => {
  it('summarises what is left to buy on each list', () => {
    setup([MARKET, DONE]);
    render(<PlannedListsScreen />);

    expect(screen.getByText('Saturday market')).toBeTruthy();
    expect(screen.getByText('3 to buy · 12 500 FCFA')).toBeTruthy();
    expect(screen.getByText('All bought · 2 items')).toBeTruthy();
  });

  it('says a list is empty rather than that everything was bought', () => {
    setup([EMPTY]);
    render(<PlannedListsScreen />);

    expect(screen.getByText('No items yet')).toBeTruthy();
    expect(screen.queryByText(/All bought/)).toBeNull();
  });

  it('counts a single bought item in the singular', () => {
    setup([{ ...DONE, itemCount: 1 }]);
    render(<PlannedListsScreen />);

    expect(screen.getByText('All bought · 1 item')).toBeTruthy();
  });

  it('shows the date each list was created', () => {
    setup([MARKET]);
    render(<PlannedListsScreen />);

    expect(screen.getByText('Created 30 September 2026')).toBeTruthy();
  });

  it('opens a list when its row is tapped', () => {
    setup([MARKET]);
    render(<PlannedListsScreen />);

    fireEvent.press(screen.getByTestId('planned-list-1'));

    expect(mockPush).toHaveBeenCalledWith('/planned/1');
  });

  it('shows an empty state that explains what lists are for', () => {
    setup([]);
    render(<PlannedListsScreen />);

    expect(screen.getByText('No shopping lists yet')).toBeTruthy();
  });

  it('creates a list from the new-list sheet', async () => {
    const { create } = setup([]);
    render(<PlannedListsScreen />);

    fireEvent.press(screen.getByTestId('planned-new-list'));
    fireEvent.changeText(screen.getByTestId('new-list-name'), 'Back to school');
    pickDueDate(new Date(2026, 9, 17));
    await act(async () => {
      fireEvent.press(screen.getByTestId('new-list-create'));
    });

    expect(create).toHaveBeenCalledWith('Back to school', '2026-10-17');
  });

  it('does not create a list with a blank name', async () => {
    const { create } = setup([]);
    render(<PlannedListsScreen />);

    fireEvent.press(screen.getByTestId('planned-new-list'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('new-list-create'));
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('will not create a list without a due date', async () => {
    const { create } = setup([]);
    render(<PlannedListsScreen />);

    fireEvent.press(screen.getByTestId('planned-new-list'));
    fireEvent.changeText(screen.getByTestId('new-list-name'), 'Back to school');
    await act(async () => {
      fireEvent.press(screen.getByTestId('new-list-create'));
    });

    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText('Choose the day you plan to shop.')).toBeTruthy();
  });

  describe('due badges', () => {
    it('shows when a list is due', () => {
      setup([{ ...MARKET, dueDate: '2026-10-20' }]);
      render(<PlannedListsScreen />);
      expect(screen.getByText('Due 20 October 2026')).toBeTruthy();
    });

    it('warns when a list is due within three days', () => {
      setup([{ ...MARKET, dueDate: '2026-10-06' }]);
      render(<PlannedListsScreen />);
      expect(screen.getByText('Due in 2 days')).toBeTruthy();
    });

    it('says when a list is due today', () => {
      setup([{ ...MARKET, dueDate: '2026-10-04' }]);
      render(<PlannedListsScreen />);
      expect(screen.getByText('Due today')).toBeTruthy();
    });

    it('flags a list whose date has passed with items still to buy', () => {
      setup([{ ...MARKET, dueDate: '2026-10-01' }]);
      render(<PlannedListsScreen />);
      expect(screen.getByText('Overdue by 3 days')).toBeTruthy();
    });

    it('stays quiet about a finished list', () => {
      setup([{ ...DONE, dueDate: '2026-10-01' }]);
      render(<PlannedListsScreen />);
      expect(screen.queryByText(/Overdue/)).toBeNull();
    });

    it('says when a list made before due dates has none', () => {
      setup([{ ...MARKET, dueDate: null }]);
      render(<PlannedListsScreen />);
      expect(screen.getByText('No due date')).toBeTruthy();
    });
  });

  it('reads in French', async () => {
    setup([MARKET]);
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<PlannedListsScreen />);

    expect(screen.getByText('Achats prévus')).toBeTruthy();
    expect(screen.getByText('3 à acheter · 12 500 FCFA')).toBeTruthy();
    expect(screen.getByText('Créée le 30 septembre 2026')).toBeTruthy();
    expect(screen.getByText('Pour le 10 octobre 2026')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
