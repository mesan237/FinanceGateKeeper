import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type { Allocation } from '@/features/finance/budget/budget.types';

const mockReplace = jest.fn();
const mockPush = jest.fn();
// Captured `useFocusEffect` callbacks. The mock does not auto-run them (the
// mount refresh comes from `useAllocation`); a test fires the latest to
// simulate the screen regaining focus after returning from settings.
const mockFocusCallbacks: Array<() => void> = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    mockFocusCallbacks.push(cb);
  },
}));

// `calculateBreakdown` is a pure function the screen calls directly â€” use the
// real implementation so the test asserts on real amounts. Async DB-backed
// functions are mocked.
jest.mock('@/features/finance/budget/budget.service', () => ({
  ...jest.requireActual<object>('@/features/finance/budget/budget.service'),
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
  lockAllocation: jest.fn(),
  redistributeEmergencyPct: jest.fn(),
  getMonthlyBudget: jest.fn(),
  getExpensesMonthlyTotal: jest.fn(),
  hasConfirmedAnyAllocation: jest.fn(),
}));

jest.mock('@/features/finance/funds/funds.service', () => ({
  depositToFund: jest.fn(),
}));

jest.mock('@/features/finance/projects/projects.service', () => ({
  fundProjects: jest.fn(),
}));

jest.mock('@/features/finance/income/income.service', () => ({
  markIncomeAllocated: jest.fn(),
}));

import { AllocationScreen } from '@/features/finance/budget/AllocationScreen';
import * as budgetService from '@/features/finance/budget/budget.service';
import * as fundsService from '@/features/finance/funds/funds.service';
import * as incomeService from '@/features/finance/income/income.service';
import * as projectsService from '@/features/finance/projects/projects.service';

const mockedGetOrCreate = budgetService.getOrCreateCurrentAllocation as jest.MockedFunction<
  typeof budgetService.getOrCreateCurrentAllocation
>;
const mockedGetAllocation = budgetService.getAllocation as jest.MockedFunction<
  typeof budgetService.getAllocation
>;
const mockedLock = budgetService.lockAllocation as jest.MockedFunction<
  typeof budgetService.lockAllocation
>;
const mockedRedistribute = budgetService.redistributeEmergencyPct as jest.MockedFunction<
  typeof budgetService.redistributeEmergencyPct
>;
const mockedDeposit = fundsService.depositToFund as jest.MockedFunction<
  typeof fundsService.depositToFund
>;
const mockedFundProjects = projectsService.fundProjects as jest.MockedFunction<
  typeof projectsService.fundProjects
>;
const mockedMarkAllocated = incomeService.markIncomeAllocated as jest.MockedFunction<
  typeof incomeService.markIncomeAllocated
>;
const mockedHasConfirmed = budgetService.hasConfirmedAnyAllocation as jest.MockedFunction<
  typeof budgetService.hasConfirmedAnyAllocation
>;

function depositResult(targetNewlyMet: boolean) {
  return {
    targetNewlyMet,
    fund: {
      id: 1,
      type: 'emergency' as const,
      targetAmount: 500000,
      currentAmount: 0,
      isTargetMet: targetNewlyMet,
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  };
}

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
  mockFocusCallbacks.length = 0;
  mockedGetOrCreate.mockResolvedValue(UNLOCKED);
  mockedGetAllocation.mockResolvedValue(UNLOCKED);
  mockedLock.mockResolvedValue(undefined);
  mockedRedistribute.mockResolvedValue(undefined);
  mockedDeposit.mockResolvedValue(depositResult(false));
  mockedFundProjects.mockResolvedValue(undefined);
  mockedMarkAllocated.mockResolvedValue(undefined);
  // Default: the user has confirmed before, so the breakdown shows directly.
  // First-ever cases override this to false.
  mockedHasConfirmed.mockResolvedValue(true);
});

describe('AllocationScreen', () => {
  it('renders the four bucket rows with the correctly calculated amounts', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);

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

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    const labels = screen
      .getAllByTestId(/bucket-row-/)
      .map((el) => el.props.testID.replace('bucket-row-', ''));
    expect(labels).toEqual(['expenses', 'projects', 'savings', 'emergency_fund']);
  });

  it('Confirm locks the month and navigates to the dashboard', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeEnabled();

    fireEvent.press(confirm);

    await waitFor(() => expect(mockedLock).toHaveBeenCalledWith('2026-06'));
    expect(mockedLock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });

  it('deposits the emergency and savings portions on confirm', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    // 400 000 Ã— 10% = 40 000 to each of emergency and savings.
    await waitFor(() =>
      expect(mockedDeposit).toHaveBeenCalledWith('emergency', 40000, 'Allocation 2026-06'),
    );
    expect(mockedDeposit).toHaveBeenCalledWith('savings', 40000, 'Allocation 2026-06');
    expect(mockedRedistribute).not.toHaveBeenCalled();
  });

  it('triggers redistribution once when the emergency deposit meets the target', async () => {
    mockedDeposit.mockImplementation(async (type) =>
      depositResult(type === 'emergency'),
    );

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockedRedistribute).toHaveBeenCalledWith('2026-06'));
    expect(mockedRedistribute).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockedLock).toHaveBeenCalledWith('2026-06'));
  });

  it('skips depositing a zero-amount bucket', async () => {
    const noEmergency: Allocation = {
      ...UNLOCKED,
      emergencyFundPct: 0,
      expensesPct: 75,
    };
    mockedGetOrCreate.mockResolvedValue(noEmergency);
    mockedGetAllocation.mockResolvedValue(noEmergency);

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockedLock).toHaveBeenCalled());
    expect(mockedDeposit).not.toHaveBeenCalledWith('emergency', expect.anything(), expect.anything());
    expect(mockedDeposit).toHaveBeenCalledWith('savings', 40000, 'Allocation 2026-06');
  });

  it('funds projects with the projects-bucket amount on confirm', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    // 400 000 Ã— 15% = 60 000 to projects. fundProjects dates each contribution
    // itself (defaults to today) â€” no reason/date argument is passed.
    await waitFor(() => expect(mockedFundProjects).toHaveBeenCalledWith(60000));
    await waitFor(() => expect(mockedLock).toHaveBeenCalledWith('2026-06'));
  });

  it('skips project funding when the projects amount is zero', async () => {
    const noProjects: Allocation = {
      ...UNLOCKED,
      projectsPct: 0,
      expensesPct: 80,
    };
    mockedGetOrCreate.mockResolvedValue(noProjects);
    mockedGetAllocation.mockResolvedValue(noProjects);

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockedLock).toHaveBeenCalled());
    expect(mockedFundProjects).not.toHaveBeenCalled();
  });

  it('marks the income allocated on confirm', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(mockedMarkAllocated).toHaveBeenCalledWith(42));
  });

  it('Hold for later leaves the income pending and navigates without depositing', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Hold for later' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(mockedMarkAllocated).not.toHaveBeenCalled();
    expect(mockedDeposit).not.toHaveBeenCalled();
    expect(mockedFundProjects).not.toHaveBeenCalled();
    expect(mockedLock).not.toHaveBeenCalled();
  });

  it('renders an "Adjust split" control that opens settings for the same month', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Adjust split' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/budget/settings',
      params: { month: '2026-06' },
    });
  });

  it('recomputes the breakdown from updated percentages after returning from settings', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    // Default split: expenses 65% → 260 000.
    await screen.findByText('260 000 FCFA');

    // The user edited the split in settings: expenses 50%, savings 25%.
    const edited: Allocation = { ...UNLOCKED, expensesPct: 50, savingsPct: 25 };
    mockedGetOrCreate.mockResolvedValue(edited);

    // Simulate the screen regaining focus on return.
    await act(async () => {
      mockFocusCallbacks.at(-1)?.();
    });

    // 400 000 × 50% = 200 000 to expenses now.
    await screen.findByText('200 000 FCFA');
  });

  it('routes a first-ever allocation to settings before showing a breakdown', async () => {
    mockedHasConfirmed.mockResolvedValue(false); // never confirmed → very first allocation

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/budget/settings',
        params: { month: '2026-06' },
      }),
    );
    // The breakdown is withheld until the user has set percentages.
    expect(screen.queryByText('Emergency Fund')).toBeNull();
    // Redirects exactly once — no loop when the (still-unlocked) screen refocuses.
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('shows the breakdown directly for an existing/locked allocation and does not redirect', async () => {
    mockedHasConfirmed.mockResolvedValue(true);
    const locked: Allocation = { ...UNLOCKED, isLocked: true };
    mockedGetOrCreate.mockResolvedValue(locked);

    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('discloses the month-lock consequence before Confirm is pressed', async () => {
    render(<AllocationScreen amountFCFA={400000} monthISO="2026-06" incomeId={42} />);
    await screen.findByText('Emergency Fund');

    expect(screen.getByText('Confirming locks this split until next month.')).toBeTruthy();
    expect(mockedLock).not.toHaveBeenCalled();
  });
});

