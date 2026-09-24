import { fireEvent, render, screen, within } from '@testing-library/react-native';
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
  monthISO: '2026-09',
  daysRemaining: 6,
  todaySpending: 5000,
  spendingTrend: [0, 1000, 0, 2500, 0, 0, 5000],
  zeroDay: { hasExpenses: true, zeroDayConfirmed: false },
  budget: MOCK_BUDGET,
  cashflow: { income: 100000, expenses: 20000, net: 80000 },
  dailyPace: 2167,
};

const BARE_STATE: DashboardState = {
  monthISO: '2026-09',
  daysRemaining: 6,
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
    it('renders the month overview and today spending', () => {
      setupHooks(FULL_STATE);
      render(<DashboardScreen />);

      expect(screen.getByTestId('month-overview-card')).toBeTruthy();
      expect(screen.getByTestId('today-spending')).toBeTruthy();
    });

    it('heads the overview with the month and its remaining days', () => {
      setupHooks(FULL_STATE);
      render(<DashboardScreen />);

      expect(screen.getByText('SEPTEMBER')).toBeTruthy();
      expect(screen.getByText('6 days left')).toBeTruthy();
    });

    it('opens the budget planner for the shown month from the no-budget prompt', () => {
      setupHooks({
        ...FULL_STATE,
        budget: { ...MOCK_BUDGET, expenseBudget: 0, expensesRemaining: 0, spentPct: 0 },
      });
      render(<DashboardScreen />);

      fireEvent.press(screen.getByTestId('month-overview-set-budget'));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/budget/plan',
        params: { month: '2026-09' },
      });
    });

  });

  describe('with a snapshot carrying no budget data', () => {
    it('shows today spending and the action bar, but hides the month overview', () => {
      setupHooks(BARE_STATE);
      render(<DashboardScreen />);

      expect(screen.queryByTestId('month-overview-card')).toBeNull();
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

  it('scrolls the quick-log block with the page instead of pinning it to the bottom', () => {
    setupHooks(BARE_STATE);
    render(<DashboardScreen />);

    // Inside the ScrollView is the whole point: a sibling of it would be the
    // sticky bar this replaced.
    const scroll = within(screen.getByTestId('dashboard-scroll'));
    expect(scroll.getByTestId('quick-log-expense')).toBeTruthy();
    expect(scroll.getByTestId('quick-log-income')).toBeTruthy();
    expect(scroll.getByTestId('quick-confirm-zero-day')).toBeTruthy();
  });

  it('leads with the month overview and puts the quick-log block directly under it', () => {
    setupHooks(FULL_STATE);
    render(<DashboardScreen />);

    // The serialised tree is in document order, so an earlier index is an
    // earlier card on the page. The cashflow figures moved into the overview
    // hero, so they now sit above the quick-log block rather than below it.
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('month-overview-card')).toBeLessThan(tree.indexOf('quick-log-expense'));
    expect(tree.indexOf('quick-log-expense')).toBeLessThan(tree.indexOf('today-spending'));
  });
});
