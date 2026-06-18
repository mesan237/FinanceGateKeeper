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
const MOCK_FUNDS = {
  emergency: { fundId: 1, type: 'emergency' as const, current: 320000, target: 500000, pct: 64 },
  savings: { fundId: 2, type: 'savings' as const, current: 80000, target: null, pct: null },
};
const MOCK_TOP_PROJECT = {
  project: {
    id: 1,
    name: 'E-commerce Launch',
    targetAmount: 500000,
    fundedAmount: 110000,
    priorityRank: 1,
    deadline: null,
    status: 'active' as const,
    createdAt: '2026-06-01',
  },
  pct: 22,
};

const CONTROL_STATE: DashboardState = {
  todaySpending: 5000,
  spendingTrend: [0, 1000, 0, 2500, 0, 0, 5000],
  zeroDay: { hasExpenses: true, zeroDayConfirmed: false },
  budget: MOCK_BUDGET,
  cashflow: { income: 100000, expenses: 20000, net: 80000 },
  dailyPace: 2167,
  funds: MOCK_FUNDS,
  topProject: MOCK_TOP_PROJECT,
};

const LEARNING_STATE: DashboardState = {
  todaySpending: 5000,
  spendingTrend: [0, 1000, 0, 2500, 0, 0, 5000],
  zeroDay: { hasExpenses: false, zeroDayConfirmed: false },
  budget: null,
  cashflow: null,
  dailyPace: null,
  funds: null,
  topProject: null,
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
  describe('control mode (includeBudgetData=true)', () => {
    it('renders BudgetSummaryCard, FundStatusCard, top-project card, and today spending', () => {
      setupHooks(CONTROL_STATE);
      render(<DashboardScreen includeBudgetData={true} />);

      expect(screen.getByTestId('budget-summary-card')).toBeTruthy();
      expect(screen.getByTestId('fund-status-card')).toBeTruthy();
      expect(screen.getByTestId('top-project-card')).toBeTruthy();
      expect(screen.getByTestId('today-spending')).toBeTruthy();
    });

    it('shows the project name and funding percentage', () => {
      setupHooks(CONTROL_STATE);
      render(<DashboardScreen includeBudgetData={true} />);

      expect(screen.getByText('E-commerce Launch')).toBeTruthy();
      expect(screen.getByText(/22%/)).toBeTruthy();
    });
  });

  describe('learning mode (includeBudgetData=false)', () => {
    it('shows today spending and action bar, but hides budget/fund/project cards', () => {
      setupHooks(LEARNING_STATE);
      render(<DashboardScreen includeBudgetData={false} />);

      expect(screen.queryByTestId('budget-summary-card')).toBeNull();
      expect(screen.queryByTestId('fund-status-card')).toBeNull();
      expect(screen.queryByTestId('top-project-card')).toBeNull();
      expect(screen.getByTestId('today-spending')).toBeTruthy();
      expect(screen.getByTestId('quick-log-expense')).toBeTruthy();
    });
  });

  it('shows loading indicator while loading', () => {
    setupHooks(null, true);
    render(<DashboardScreen includeBudgetData={false} />);

    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('renders without crash when state is null (empty DB)', () => {
    setupHooks(null, false);
    expect(() => render(<DashboardScreen includeBudgetData={false} />)).not.toThrow();
  });

  it('displays today spending formatted as FCFA', () => {
    setupHooks(LEARNING_STATE);
    render(<DashboardScreen includeBudgetData={false} />);

    expect(screen.getByText('5 000 FCFA')).toBeTruthy();
  });

  it('quick action Log Expense navigates to /expenses/log', () => {
    setupHooks(LEARNING_STATE);
    render(<DashboardScreen includeBudgetData={false} />);

    fireEvent.press(screen.getByTestId('quick-log-expense'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/log');
  });

  it('quick action Log Income navigates to /income/log', () => {
    setupHooks(LEARNING_STATE);
    render(<DashboardScreen includeBudgetData={false} />);

    fireEvent.press(screen.getByTestId('quick-log-income'));
    expect(mockPush).toHaveBeenCalledWith('/income/log');
  });

  it('hides Confirm Zero Day quick action when day has activity', () => {
    setupHooks(CONTROL_STATE); // zeroDay.hasExpenses = true
    render(<DashboardScreen includeBudgetData={true} />);

    expect(screen.queryByTestId('quick-confirm-zero-day')).toBeNull();
  });

  it('shows Confirm Zero Day quick action when day has no activity', () => {
    setupHooks(LEARNING_STATE); // zeroDay all false
    render(<DashboardScreen includeBudgetData={false} />);

    expect(screen.getByTestId('quick-confirm-zero-day')).toBeTruthy();
  });
});
