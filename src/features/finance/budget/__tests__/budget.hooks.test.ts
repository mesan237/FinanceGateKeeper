import { act, renderHook, waitFor } from '@testing-library/react-native';

import type {
  MonthlyBudget,
  OverBudgetCheck,
} from '@/features/finance/budget/budget.types';
import { currentMonthISO } from '@/utils/formatDate';

jest.mock('@/features/finance/budget/budget.service', () => ({
  getMonthlyBudget: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.plan', () => ({
  checkOverBudget: jest.fn(),
}));

import { useBudgetStatus, useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';
import * as budgetPlan from '@/features/finance/budget/budget.plan';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetBudget = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;
const mockedCheckOverBudget = budgetPlan.checkOverBudget as jest.MockedFunction<
  typeof budgetPlan.checkOverBudget
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBudgetStatus', () => {
  const BUDGET: MonthlyBudget = {
    month: '2026-06',
    incomeTotal: 400000,
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
