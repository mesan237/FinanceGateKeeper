import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type { Allocation } from '@/features/finance/budget/budget.types';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

// `calculateBreakdown` is a pure function the screen calls directly — use the
// real implementation so the test asserts on real amounts. Async DB-backed
// functions are mocked.
jest.mock('@/features/finance/budget/budget.service', () => ({
  ...jest.requireActual<object>('@/features/finance/budget/budget.service'),
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
  lockAllocation: jest.fn(),
  getMonthlyBudget: jest.fn(),
  getExpensesMonthlyTotal: jest.fn(),
}));

import { AllocationScreen } from '@/features/finance/budget/AllocationScreen';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetOrCreate = budgetService.getOrCreateCurrentAllocation as jest.MockedFunction<
  typeof budgetService.getOrCreateCurrentAllocation
>;
const mockedGetAllocation = budgetService.getAllocation as jest.MockedFunction<
  typeof budgetService.getAllocation
>;
const mockedLock = budgetService.lockAllocation as jest.MockedFunction<
  typeof budgetService.lockAllocation
>;

const UNLOCKED: Allocation = {
  id: 1,
  month: '2026-06',
  emergencyFundPct: DEFAULT_ALLOCATION.emergencyFundPct,
  savingsPct: DEFAULT_ALLOCATION.savingsPct,
  projectsPct: DEFAULT_ALLOCATION.projectsPct,
  expensesPct: DEFAULT_ALLOCATION.expensesPct,
  priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
  isLocked: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOrCreate.mockResolvedValue(UNLOCKED);
  mockedGetAllocation.mockResolvedValue(UNLOCKED);
  mockedLock.mockResolvedValue(undefined);
});

describe('AllocationScreen', () => {
  it('renders the four bucket rows with the correctly calculated amounts', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" />);

    await screen.findByText('Emergency Fund');
    expect(screen.getByText('Emergency Fund')).toBeTruthy();
    expect(screen.getByText('Savings')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Expenses')).toBeTruthy();

    // Two buckets share the value 40 000 (Emergency, Savings); the next two are unique.
    expect(screen.getAllByText('40 000 FCFA').length).toBe(2);
    expect(screen.getByText('60 000 FCFA')).toBeTruthy();
    expect(screen.getByText('260 000 FCFA')).toBeTruthy();
  });

  it('renders rows in the allocation priority order', async () => {
    const reordered: Allocation = {
      ...UNLOCKED,
      priorityOrder: ['expenses', 'projects', 'savings', 'emergency_fund'],
    };
    mockedGetOrCreate.mockResolvedValue(reordered);
    mockedGetAllocation.mockResolvedValue(reordered);

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" />);
    await screen.findByText('Emergency Fund');

    const labels = screen
      .getAllByTestId(/bucket-row-/)
      .map((el) => el.props.testID.replace('bucket-row-', ''));
    expect(labels).toEqual(['expenses', 'projects', 'savings', 'emergency_fund']);
  });

  it('Confirm locks the month and navigates to the dashboard', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" />);
    await screen.findByText('Emergency Fund');

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeEnabled();

    fireEvent.press(confirm);

    await waitFor(() => expect(mockedLock).toHaveBeenCalledWith('2026-06'));
    expect(mockedLock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dashboard'));
  });
});
