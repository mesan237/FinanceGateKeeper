import { act, renderHook, waitFor } from '@testing-library/react-native';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type {
  Allocation,
  MonthlyBudget,
  OverBudgetCheck,
} from '@/features/finance/budget/budget.types';
import { currentMonthISO } from '@/utils/formatDate';

jest.mock('@/features/finance/budget/budget.service', () => ({
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
  lockAllocation: jest.fn(),
  getMonthlyBudget: jest.fn(),
  checkOverBudget: jest.fn(),
  redistributeEmergencyPct: jest.fn(),
  hasConfirmedAnyAllocation: jest.fn(),
}));

jest.mock('@/features/finance/funds/funds.service', () => ({
  depositToFund: jest.fn(),
  getOrCreateFunds: jest.fn(),
}));

jest.mock('@/features/finance/projects/projects.service', () => ({
  contributeManually: jest.fn(),
  getProjects: jest.fn(),
}));

jest.mock('@/features/finance/income/income.service', () => ({
  getPendingIncome: jest.fn(),
  markIncomeAllocated: jest.fn(),
}));

import {
  useAllocation,
  useBudgetStatus,
  useIsFirstEverAllocation,
  useOverBudgetCheck,
  useUnallocatedPool,
} from '@/features/finance/budget/budget.hooks';
import * as budgetService from '@/features/finance/budget/budget.service';
import { depositToFund, getOrCreateFunds } from '@/features/finance/funds/funds.service';
import * as incomeService from '@/features/finance/income/income.service';
import type { Income } from '@/features/finance/income/income.types';
import { contributeManually, getProjects } from '@/features/finance/projects/projects.service';

const mockedGetOrCreate = budgetService.getOrCreateCurrentAllocation as jest.MockedFunction<
  typeof budgetService.getOrCreateCurrentAllocation
>;
const mockedGetAllocation = budgetService.getAllocation as jest.MockedFunction<
  typeof budgetService.getAllocation
>;
const mockedUpdate = budgetService.updateAllocation as jest.MockedFunction<
  typeof budgetService.updateAllocation
>;
const mockedLock = budgetService.lockAllocation as jest.MockedFunction<
  typeof budgetService.lockAllocation
>;
const mockedGetBudget = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;
const mockedCheckOverBudget = budgetService.checkOverBudget as jest.MockedFunction<
  typeof budgetService.checkOverBudget
>;
const mockedRedistribute = budgetService.redistributeEmergencyPct as jest.MockedFunction<
  typeof budgetService.redistributeEmergencyPct
>;
const mockedDeposit = depositToFund as jest.MockedFunction<typeof depositToFund>;
const mockedContribute = contributeManually as jest.MockedFunction<typeof contributeManually>;
const mockedGetPending = incomeService.getPendingIncome as jest.MockedFunction<
  typeof incomeService.getPendingIncome
>;
const mockedMarkAllocated = incomeService.markIncomeAllocated as jest.MockedFunction<
  typeof incomeService.markIncomeAllocated
>;
const mockedHasConfirmed = budgetService.hasConfirmedAnyAllocation as jest.MockedFunction<
  typeof budgetService.hasConfirmedAnyAllocation
>;

function pendingIncome(overrides: Partial<Income> = {}): Income {
  return {
    id: 1,
    amount: 50000,
    source: 'freelance',
    note: null,
    date: '2026-06-12',
    accountId: null,
    allocationStatus: 'pending',
    createdAt: '2026-06-12T00:00:00.000Z',
    ...overrides,
  };
}

const DEFAULT_ROW: Allocation = {
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
  mockedGetOrCreate.mockResolvedValue(DEFAULT_ROW);
  mockedGetAllocation.mockResolvedValue(DEFAULT_ROW);
  mockedUpdate.mockResolvedValue(undefined);
  mockedLock.mockResolvedValue(undefined);
});

describe('useAllocation', () => {
  it('auto-creates and exposes the current month allocation', async () => {
    const { result } = renderHook(() => useAllocation('2026-06'));

    await waitFor(() => expect(result.current.allocation).not.toBeNull());
    expect(mockedGetOrCreate).toHaveBeenCalledWith('2026-06');
    expect(result.current.allocation?.month).toBe('2026-06');
  });

  it('save() persists a valid draft and re-reads the row', async () => {
    const updated: Allocation = { ...DEFAULT_ROW, expensesPct: 60, savingsPct: 15 };
    // The hook only calls getAllocation in save()'s re-read; getOrCreateCurrentAllocation
    // handles the mount. So every getAllocation call should return the updated row.
    mockedGetAllocation.mockResolvedValue(updated);

    const { result } = renderHook(() => useAllocation('2026-06'));
    await waitFor(() => expect(result.current.allocation).not.toBeNull());

    await act(async () => {
      await result.current.save({
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 15,
        projectsPct: 15,
        expensesPct: 60,
        priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
      });
    });

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.allocation?.expensesPct).toBe(60));
    expect(result.current.error).toBeNull();
  });

  it('save() with an invalid draft surfaces an error and does not mutate state', async () => {
    mockedUpdate.mockRejectedValueOnce(new Error('Allocation percentages must sum to 100 (got 90).'));

    const { result } = renderHook(() => useAllocation('2026-06'));
    await waitFor(() => expect(result.current.allocation).not.toBeNull());

    await act(async () => {
      await result.current.save({
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 10,
        projectsPct: 15,
        expensesPct: 55,
        priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
      });
    });

    expect(result.current.error).toMatch(/sum to 100/);
    expect(result.current.allocation?.expensesPct).toBe(DEFAULT_ALLOCATION.expensesPct);
  });

  it('save() on a locked allocation surfaces an error', async () => {
    mockedUpdate.mockRejectedValueOnce(new Error('Allocation for 2026-06 is locked for this month.'));

    const { result } = renderHook(() => useAllocation('2026-06'));
    await waitFor(() => expect(result.current.allocation).not.toBeNull());

    await act(async () => {
      await result.current.save({
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 10,
        projectsPct: 15,
        expensesPct: 65,
        priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
      });
    });

    expect(result.current.error).toMatch(/locked/i);
  });

  it('lock() calls the service and refreshes the row', async () => {
    const locked: Allocation = { ...DEFAULT_ROW, isLocked: true };
    // Same as save(): the re-read after lock() is the only getAllocation call.
    mockedGetAllocation.mockResolvedValue(locked);

    const { result } = renderHook(() => useAllocation('2026-06'));
    await waitFor(() => expect(result.current.allocation).not.toBeNull());

    await act(async () => {
      await result.current.lock();
    });

    expect(mockedLock).toHaveBeenCalledWith('2026-06');
    await waitFor(() => expect(result.current.allocation?.isLocked).toBe(true));
  });
});

describe('useIsFirstEverAllocation', () => {
  it('is null while the check is in flight, then false once a confirmation exists', async () => {
    mockedHasConfirmed.mockResolvedValue(true);
    const { result } = renderHook(() => useIsFirstEverAllocation());

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('is true when no allocation has ever been confirmed', async () => {
    mockedHasConfirmed.mockResolvedValue(false);
    const { result } = renderHook(() => useIsFirstEverAllocation());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('falls back to false when the check fails, so the user is never trapped', async () => {
    mockedHasConfirmed.mockRejectedValue(new Error('db unavailable'));
    const { result } = renderHook(() => useIsFirstEverAllocation());

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useBudgetStatus', () => {
  const BUDGET: MonthlyBudget = {
    month: '2026-06',
    incomeTotal: 400000,
    allocation: DEFAULT_ROW,
    breakdown: { emergencyFund: 40000, savings: 40000, projects: 60000, expenses: 260000 },
    expensesLogged: 12000,
    expensesRemaining: 248000,
  };

  it('exposes the monthly budget for the given month', async () => {
    mockedGetBudget.mockResolvedValue(BUDGET);
    const { result } = renderHook(() => useBudgetStatus('2026-06'));

    await waitFor(() => expect(result.current.budget).not.toBeNull());
    expect(mockedGetBudget).toHaveBeenCalledWith('2026-06');
    expect(result.current.budget?.expensesRemaining).toBe(248000);
  });

  it('refresh() re-reads the budget', async () => {
    mockedGetBudget.mockResolvedValue(BUDGET);
    const { result } = renderHook(() => useBudgetStatus('2026-06'));
    await waitFor(() => expect(result.current.budget).not.toBeNull());

    mockedGetBudget.mockResolvedValueOnce({ ...BUDGET, expensesLogged: 17000, expensesRemaining: 243000 });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.budget?.expensesRemaining).toBe(243000));
  });
});

describe('useOverBudgetCheck', () => {
  const OVER: OverBudgetCheck = {
    isOver: true,
    overage: 3000,
    remaining: 5000,
    expenseBudget: 260000,
  };

  it('check() delegates to the service for the given month', async () => {
    mockedCheckOverBudget.mockResolvedValue(OVER);
    const { result } = renderHook(() => useOverBudgetCheck('2026-06'));

    let out: OverBudgetCheck | undefined;
    await act(async () => {
      out = await result.current.check(8000);
    });

    expect(mockedCheckOverBudget).toHaveBeenCalledWith('2026-06', 8000);
    expect(out).toEqual(OVER);
  });

  it('defaults to the current month when none is given', async () => {
    mockedCheckOverBudget.mockResolvedValue({ ...OVER, isOver: false, overage: 0 });
    const { result } = renderHook(() => useOverBudgetCheck());

    await act(async () => {
      await result.current.check(100);
    });

    expect(mockedCheckOverBudget).toHaveBeenCalledWith(currentMonthISO(), 100);
  });
});

describe('useUnallocatedPool', () => {
  const mockedGetFunds = getOrCreateFunds as jest.MockedFunction<typeof getOrCreateFunds>;
  const mockedGetProjects = getProjects as jest.MockedFunction<typeof getProjects>;

  beforeEach(() => {
    mockedGetPending.mockResolvedValue([]);
    mockedMarkAllocated.mockResolvedValue(undefined);
    mockedContribute.mockResolvedValue(undefined);
    mockedGetFunds.mockResolvedValue([]);
    mockedGetProjects.mockResolvedValue([]);
    mockedDeposit.mockResolvedValue({ targetNewlyMet: false } as Awaited<
      ReturnType<typeof depositToFund>
    >);
  });

  it('loads the pending pool and totals it', async () => {
    mockedGetPending.mockResolvedValue([
      pendingIncome({ id: 1, amount: 50000 }),
      pendingIncome({ id: 2, amount: 30000 }),
    ]);

    const { result } = renderHook(() => useUnallocatedPool());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pending).toHaveLength(2);
    expect(result.current.total).toBe(80000);
  });

  it('allocate() to a fund deposits then marks the income allocated', async () => {
    const income = pendingIncome({ id: 7, amount: 50000 });
    mockedGetPending.mockResolvedValue([income]);
    const { result } = renderHook(() => useUnallocatedPool());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.allocate(income, { kind: 'fund', fundType: 'savings' });
    });

    expect(mockedDeposit).toHaveBeenCalledWith('savings', 50000, expect.any(String));
    expect(mockedMarkAllocated).toHaveBeenCalledWith(7);
    expect(mockedRedistribute).not.toHaveBeenCalled();
  });

  it('allocate() to the emergency fund redistributes when the target is first met', async () => {
    const income = pendingIncome({ id: 8, amount: 50000 });
    mockedGetPending.mockResolvedValue([income]);
    mockedDeposit.mockResolvedValue({ targetNewlyMet: true } as Awaited<
      ReturnType<typeof depositToFund>
    >);
    const { result } = renderHook(() => useUnallocatedPool());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.allocate(income, { kind: 'fund', fundType: 'emergency' });
    });

    expect(mockedRedistribute).toHaveBeenCalledTimes(1);
    expect(mockedMarkAllocated).toHaveBeenCalledWith(8);
  });

  it('allocate() to a project records a manual contribution then marks allocated', async () => {
    const income = pendingIncome({ id: 9, amount: 40000 });
    mockedGetPending.mockResolvedValue([income]);
    const { result } = renderHook(() => useUnallocatedPool());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.allocate(income, { kind: 'project', projectId: 3 });
    });

    expect(mockedContribute).toHaveBeenCalledWith(3, 40000);
    expect(mockedDeposit).not.toHaveBeenCalled();
    expect(mockedMarkAllocated).toHaveBeenCalledWith(9);
  });

  it('allocate() to the expense budget deposits nothing but marks allocated', async () => {
    const income = pendingIncome({ id: 10, amount: 20000 });
    mockedGetPending.mockResolvedValue([income]);
    const { result } = renderHook(() => useUnallocatedPool());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.allocate(income, { kind: 'expense' });
    });

    expect(mockedDeposit).not.toHaveBeenCalled();
    expect(mockedContribute).not.toHaveBeenCalled();
    expect(mockedMarkAllocated).toHaveBeenCalledWith(10);
  });
});
