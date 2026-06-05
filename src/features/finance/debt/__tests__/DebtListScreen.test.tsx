import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { Debt } from '@/features/finance/debt/debt.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/features/finance/debt/debt.hooks', () => ({
  useDebts: jest.fn(),
}));

import { DebtListScreen } from '@/features/finance/debt/DebtListScreen';
import { useDebts } from '@/features/finance/debt/debt.hooks';

const mockedUseDebts = useDebts as jest.MockedFunction<typeof useDebts>;

const JEAN: Debt = {
  id: 1,
  personName: 'Jean',
  amount: 15000,
  direction: 'lent',
  date: '2026-06-01',
  dueDate: '2026-06-15',
  status: 'pending',
  note: null,
  settledAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const PAUL_SETTLED: Debt = {
  id: 2,
  personName: 'Paul',
  amount: 8000,
  direction: 'lent',
  date: '2026-05-01',
  dueDate: null,
  status: 'settled',
  note: null,
  settledAt: '2026-05-20T00:00:00.000Z',
  createdAt: '2026-05-01T00:00:00.000Z',
};
const AWA: Debt = {
  id: 3,
  personName: 'Awa',
  amount: 40000,
  direction: 'owed',
  date: '2026-06-02',
  dueDate: null,
  status: 'pending',
  note: null,
  settledAt: null,
  createdAt: '2026-06-02T00:00:00.000Z',
};

function stateFor(direction: 'lent' | 'owed'): ReturnType<typeof useDebts> {
  const base = {
    totals: { lent: 15000, owed: 40000 },
    loading: false,
    error: null,
    refresh: jest.fn(),
    settle: jest.fn(),
    remove: jest.fn(),
  };
  return direction === 'lent'
    ? { ...base, debts: [JEAN, PAUL_SETTLED] }
    : { ...base, debts: [AWA] };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseDebts.mockImplementation((direction) => stateFor(direction));
});

describe('DebtListScreen', () => {
  it('renders the lent tab with its outstanding total and rows', () => {
    render(<DebtListScreen />);
    expect(screen.getByText('Jean')).toBeTruthy();
    expect(screen.getByText('15 000 FCFA')).toBeTruthy();
    // settled debt shows its settled label
    expect(screen.getByText('Settled')).toBeTruthy();
  });

  it('switches to the owed tab and swaps the list', () => {
    render(<DebtListScreen />);
    expect(screen.queryByText('Awa')).toBeNull();
    fireEvent.press(screen.getByTestId('debt-tab-owed'));
    expect(screen.getByText('Awa')).toBeTruthy();
    expect(screen.queryByText('Jean')).toBeNull();
  });

  it('navigates to the create form from the Add button', () => {
    render(<DebtListScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Add debt' }));
    expect(mockPush).toHaveBeenCalledWith('/debt/create');
  });

  it('navigates to a debt detail when a row is pressed', () => {
    render(<DebtListScreen />);
    fireEvent.press(screen.getByTestId('debt-row-1'));
    expect(mockPush).toHaveBeenCalledWith('/debt/1');
  });

  it('shows an empty state when a tab has no debts', () => {
    mockedUseDebts.mockImplementation((direction) => ({ ...stateFor(direction), debts: [] }));
    render(<DebtListScreen />);
    expect(screen.getByText('No debts here yet.')).toBeTruthy();
  });
});
