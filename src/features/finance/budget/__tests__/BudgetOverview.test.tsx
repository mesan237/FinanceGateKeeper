import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type { Allocation, MonthlyBudget } from '@/features/finance/budget/budget.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/features/finance/budget/budget.service', () => ({
  ...jest.requireActual<object>('@/features/finance/budget/budget.service'),
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
  lockAllocation: jest.fn(),
  getMonthlyBudget: jest.fn(),
  getExpensesMonthlyTotal: jest.fn(),
}));

// Override only the unallocated-pool hook so BudgetOverview tests don't reach
// the income/funds/projects services; useBudgetStatus stays real.
const mockUnallocatedPool = jest.fn();
jest.mock('@/features/finance/budget/budget.hooks', () => ({
  ...jest.requireActual<object>('@/features/finance/budget/budget.hooks'),
  useUnallocatedPool: () => mockUnallocatedPool(),
}));

import { BudgetOverview } from '@/features/finance/budget/BudgetOverview';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetBudget = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;

const ALLOCATION: Allocation = {
  id: 1,
  month: '2026-06',
  emergencyFundPct: DEFAULT_ALLOCATION.emergencyFundPct,
  savingsPct: DEFAULT_ALLOCATION.savingsPct,
  projectsPct: DEFAULT_ALLOCATION.projectsPct,
  expensesPct: DEFAULT_ALLOCATION.expensesPct,
  priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
  isLocked: true,
  createdAt: '2026-06-01T00:00:00.000Z',
};

const POPULATED: MonthlyBudget = {
  month: '2026-06',
  incomeTotal: 400000,
  allocation: ALLOCATION,
  breakdown: { emergencyFund: 40000, savings: 40000, projects: 60000, expenses: 260000 },
  expensesLogged: 12000,
  expensesRemaining: 248000,
};

const EMPTY: MonthlyBudget = {
  month: '2026-06',
  incomeTotal: 0,
  allocation: { ...ALLOCATION, isLocked: false },
  breakdown: { emergencyFund: 0, savings: 0, projects: 0, expenses: 0 },
  expensesLogged: 0,
  expensesRemaining: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUnallocatedPool.mockReturnValue({ total: 0 });
});

describe('BudgetOverview', () => {
  it('shows the remaining expense budget and the four bucket rows in priority order', async () => {
    mockedGetBudget.mockResolvedValue(POPULATED);
    render(<BudgetOverview monthISO="2026-06" />);

    await screen.findByText(/Expenses remaining/i);
    expect(screen.getByText('248 000 FCFA')).toBeTruthy();

    const labels = (await screen.findAllByTestId(/bucket-row-/)).map((el) =>
      el.props.testID.replace('bucket-row-', ''),
    );
    expect(labels).toEqual(['emergency_fund', 'savings', 'projects', 'expenses']);
  });

  it('renders the expense-progress bar reflecting spent vs. allocated budget', async () => {
    mockedGetBudget.mockResolvedValue(POPULATED);
    render(<BudgetOverview monthISO="2026-06" />);

    const fill = await screen.findByTestId('expense-progress-fill');
    // 12 000 logged of 260 000 allocated ≈ 5%.
    expect(fill.props.accessibilityValue.now).toBe(5);
  });

  it('surfaces the locked pill when the month is locked', async () => {
    mockedGetBudget.mockResolvedValue(POPULATED);
    render(<BudgetOverview monthISO="2026-06" />);

    expect(await screen.findByText(/Locked for this month/i)).toBeTruthy();
  });

  it('renders the empty state when no income has been logged for the month', async () => {
    mockedGetBudget.mockResolvedValue(EMPTY);
    render(<BudgetOverview monthISO="2026-06" />);

    await screen.findByText(/Log income to start/i);
    expect(screen.queryByTestId(/bucket-row-/)).toBeNull();
  });

  it('Edit allocation navigates to /budget/settings', async () => {
    mockedGetBudget.mockResolvedValue(POPULATED);
    render(<BudgetOverview monthISO="2026-06" />);
    await screen.findByText(/Expenses remaining/i);

    fireEvent.press(screen.getByRole('button', { name: 'Edit allocation' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/budget/settings'));
  });

  it('surfaces the unallocated pool and navigates to it when income is held', async () => {
    mockedGetBudget.mockResolvedValue(POPULATED);
    mockUnallocatedPool.mockReturnValue({ total: 75000 });
    render(<BudgetOverview monthISO="2026-06" />);

    await screen.findByText(/Unallocated income/i);
    expect(screen.getByText('75 000 FCFA')).toBeTruthy();

    fireEvent.press(screen.getByTestId('unallocated-pool-link'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/budget/unallocated'));
  });

  it('hides the unallocated-pool row when nothing is held', async () => {
    mockedGetBudget.mockResolvedValue(POPULATED);
    mockUnallocatedPool.mockReturnValue({ total: 0 });
    render(<BudgetOverview monthISO="2026-06" />);

    await screen.findByText(/Expenses remaining/i);
    expect(screen.queryByTestId('unallocated-pool-link')).toBeNull();
  });
});
