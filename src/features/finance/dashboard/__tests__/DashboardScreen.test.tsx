import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/features/finance/dashboard/dashboard.hooks', () => ({
  useDashboard: jest.fn(),
}));

jest.mock('@/features/finance/expenses/expenses.hooks', () => ({
  useZeroDay: jest.fn(),
}));

// Stub the sheet so this test stays focused on the dashboard wiring, not the
// sheet's full dependency tree. Echoes visibility + the requested segment.
jest.mock('@/features/finance/expenses/AddTransactionSheet', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    AddTransactionSheet: ({ visible, initialSegment }: { visible: boolean; initialSegment?: string }) =>
      visible
        ? ReactLib.createElement(Text, { testID: 'add-sheet-mock' }, `sheet:${initialSegment ?? 'expense'}`)
        : null,
  };
});

import { DashboardScreen } from '@/features/finance/dashboard/DashboardScreen';
import { useDashboard } from '@/features/finance/dashboard/dashboard.hooks';
import { useZeroDay } from '@/features/finance/expenses/expenses.hooks';
import type { DashboardState } from '@/features/finance/dashboard/dashboard.types';

const mockedUseDashboard = useDashboard as jest.MockedFunction<typeof useDashboard>;
const mockedUseZeroDay = useZeroDay as jest.MockedFunction<typeof useZeroDay>;

const MOCK_BUDGET = {
  expenseBudget: 65000,
  expensesLogged: 20000,
  expensesRemaining: 45000,
  spentPct: 31,
  pace: 'green' as const,
};

const FULL_STATE: DashboardState = {
  todaySpending: 5000,
  spendingTrend: [0, 1000, 0, 2500, 0, 0, 5000],
  zeroDay: { hasExpenses: true, zeroDayConfirmed: false },
  budget: MOCK_BUDGET,
  cashflow: { income: 100000, expenses: 20000, net: 80000 },
  dailyPace: 2167,
};

const BARE_STATE: DashboardState = {
  todaySpending: 5000,
  spendingTrend: [0, 1000, 0, 2500, 0, 0, 5000],
  zeroDay: { hasExpenses: false, zeroDayConfirmed: false },
  budget: null,
  cashflow: null,
  dailyPace: null,
};

function setupHooks(state: DashboardState | null, loading = false) {
  mockedUseDashboard.mockReturnValue({
    state,
    loading,
    error: null,
    refresh: jest.fn(),
  });
  mockedUseZeroDay.mockReturnValue({
    status: state?.zeroDay ?? { hasExpenses: false, zeroDayConfirmed: false },
    loading: false,
    refresh: jest.fn(),
    confirm: jest.fn(),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DashboardScreen', () => {
  describe('with a full snapshot', () => {
    it('renders the budget summary and today spending', () => {
      setupHooks(FULL_STATE);
      render(<DashboardScreen />);

      expect(screen.getByTestId('budget-summary-card')).toBeTruthy();
      expect(screen.getByTestId('today-spending')).toBeTruthy();
    });

  });

  describe('with a snapshot carrying no budget data', () => {
    it('shows today spending and the action bar, but hides the budget card', () => {
      setupHooks(BARE_STATE);
      render(<DashboardScreen />);

      expect(screen.queryByTestId('budget-summary-card')).toBeNull();
      expect(screen.getByTestId('today-spending')).toBeTruthy();
      expect(screen.getByTestId('quick-log-expense')).toBeTruthy();
    });
  });

  it('shows loading indicator while loading', () => {
    setupHooks(null, true);
    render(<DashboardScreen />);

    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders without crash when state is null (empty DB)', () => {
    setupHooks(null, false);
    expect(() => render(<DashboardScreen />)).not.toThrow();
  });

  it('displays today spending formatted as FCFA', () => {
    setupHooks(BARE_STATE);
    render(<DashboardScreen />);

    expect(screen.getByText('5 000 FCFA')).toBeTruthy();
  });

  it('opens the add-transaction sheet on the Expense segment for Log Expense (VS-26)', () => {
    setupHooks(BARE_STATE);
    render(<DashboardScreen />);

    expect(screen.queryByTestId('add-sheet-mock')).toBeNull();
    fireEvent.press(screen.getByTestId('quick-log-expense'));
    expect(screen.getByTestId('add-sheet-mock')).toHaveTextContent('sheet:expense');
  });

  it('opens the add-transaction sheet on the Income segment for Log Income (VS-26)', () => {
    setupHooks(BARE_STATE);
    render(<DashboardScreen />);

    fireEvent.press(screen.getByTestId('quick-log-income'));
    expect(screen.getByTestId('add-sheet-mock')).toHaveTextContent('sheet:income');
  });

  it('never pushes the retired full-screen log routes (VS-26)', () => {
    setupHooks(BARE_STATE);
    render(<DashboardScreen />);

    fireEvent.press(screen.getByTestId('quick-log-expense'));
    fireEvent.press(screen.getByTestId('quick-log-income'));
    expect(mockPush).not.toHaveBeenCalledWith('/expenses/log');
    expect(mockPush).not.toHaveBeenCalledWith('/income/log');
  });

  it('hides Confirm Zero Day quick action when day has activity', () => {
    setupHooks(FULL_STATE); // zeroDay.hasExpenses = true
    render(<DashboardScreen />);

    expect(screen.queryByTestId('quick-confirm-zero-day')).toBeNull();
  });

  it('shows Confirm Zero Day quick action when day has no activity', () => {
    setupHooks(BARE_STATE); // zeroDay all false
    render(<DashboardScreen />);

    expect(screen.getByTestId('quick-confirm-zero-day')).toBeTruthy();
  });
});
