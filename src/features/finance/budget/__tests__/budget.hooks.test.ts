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
}));

import {
  useAllocation,
  useBudgetStatus,
  useOverBudgetCheck,
} from '@/features/finance/budget/budget.hooks';
import * as budgetService from '@/features/finance/budget/budget.service';

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
