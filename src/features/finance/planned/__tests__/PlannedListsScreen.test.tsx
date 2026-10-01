import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { PlannedList } from '@/features/finance/planned/planned.types';
import i18n from '@/i18n';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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
  openCount: 3,
  openEstimate: 12500,
  createdAt: '2026-09-30T00:00:00.000Z',
};
const DONE: PlannedList = { ...MARKET, id: 2, name: 'School', openCount: 0, openEstimate: 0 };

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

describe('PlannedListsScreen', () => {
  it('summarises what is left to buy on each list', () => {
    setup([MARKET, DONE]);
    render(<PlannedListsScreen />);

    expect(screen.getByText('Saturday market')).toBeTruthy();
    expect(screen.getByText('3 to buy · 12 500 FCFA')).toBeTruthy();
    expect(screen.getByText('Everything bought')).toBeTruthy();
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
    await act(async () => {
      fireEvent.press(screen.getByTestId('new-list-create'));
    });

    expect(create).toHaveBeenCalledWith('Back to school');
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

  it('reads in French', async () => {
    setup([MARKET]);
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<PlannedListsScreen />);

    expect(screen.getByText('Achats prévus')).toBeTruthy();
    expect(screen.getByText('3 à acheter · 12 500 FCFA')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
