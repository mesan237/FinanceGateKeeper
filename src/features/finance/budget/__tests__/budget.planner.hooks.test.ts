import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Category } from '@/features/finance/expenses/expenses.types';

jest.mock('@/features/finance/budget/budget.envelopes', () => ({
  getCategoryBudgets: jest.fn(),
  setCategoryBudget: jest.fn(),
  setTotalBudget: jest.fn(),
  copyBudgetsFromMonth: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.plan', () => ({
  buildMonthlyPlan: jest.fn(),
  getBudgetableCategories: jest.fn(),
  suggestFromHistory: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.service', () => ({
  getMonthlyBudget: jest.fn(),
}));

import * as envelopes from '@/features/finance/budget/budget.envelopes';
import * as plan from '@/features/finance/budget/budget.plan';
import { useBudgetPlanner } from '@/features/finance/budget/budget.planner.hooks';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetBudgets = envelopes.getCategoryBudgets as jest.MockedFunction<
  typeof envelopes.getCategoryBudgets
>;
const mockedSetBudget = envelopes.setCategoryBudget as jest.MockedFunction<
  typeof envelopes.setCategoryBudget
>;
const mockedSetTotal = envelopes.setTotalBudget as jest.MockedFunction<
  typeof envelopes.setTotalBudget
>;
const mockedBuildPlan = plan.buildMonthlyPlan as jest.MockedFunction<typeof plan.buildMonthlyPlan>;
const mockedGetCategories = plan.getBudgetableCategories as jest.MockedFunction<
  typeof plan.getBudgetableCategories
>;
const mockedSuggest = plan.suggestFromHistory as jest.MockedFunction<typeof plan.suggestFromHistory>;
const mockedMonthly = budgetService.getMonthlyBudget as jest.MockedFunction<
  typeof budgetService.getMonthlyBudget
>;

const FOOD = 1;
const TRANSPORT = 5;

function category(id: number, name: string): Category {
  return { id, name, parentId: null, isDefault: true, isHidden: false };
}

/** Wires the default mock responses; individual tests override what they care about. */
function setup(options: { isExplicit?: boolean; totalBudget?: number } = {}) {
  const { isExplicit = true, totalBudget = 200_000 } = options;

  mockedGetCategories.mockResolvedValue([category(FOOD, 'Food'), category(TRANSPORT, 'Transport')]);
  mockedGetBudgets.mockResolvedValue([]);
  mockedSuggest.mockResolvedValue(new Map());
  mockedSetBudget.mockResolvedValue();
  mockedSetTotal.mockResolvedValue();
  mockedMonthly.mockResolvedValue({
    month: '2026-08',
    incomeTotal: 400_000,
    expensesLogged: 0,
    expensesRemaining: 400_000,
  });
  mockedBuildPlan.mockResolvedValue({
    month: '2026-08',
    totalBudget,
    isExplicit,
    derivedTotal: 260_000,
    assigned: 0,
    unassigned: totalBudget,
    isOverAllocated: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setup();
});

describe('useBudgetPlanner — loading', () => {
  it('seeds the total field from an explicit total', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalInput).toBe('200000');
  });

  it('leaves the total field blank when the total is inherited from the income split', async () => {
    setup({ isExplicit: false, totalBudget: 260_000 });
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Blank, so the field shows the derived figure as a placeholder rather than
    // pretending the user typed it.
    expect(result.current.totalInput).toBe('');
    expect(result.current.totalBudget).toBe(260_000);
  });

  it('seeds existing envelopes into the draft', async () => {
    mockedGetBudgets.mockResolvedValue([
      {
        id: 1,
        month: '2026-08',
        categoryId: FOOD,
        allocatedAmount: 60_000,
        rolloverEnabled: true,
        createdAt: '',
      },
    ]);

    const { result } = renderHook(() => useBudgetPlanner('2026-08'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.amounts[FOOD]).toBe('60000');
    expect(result.current.rollovers[FOOD]).toBe(true);
  });
});

describe('useBudgetPlanner — distribution', () => {
  it('tracks unassigned as amounts are entered', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '60000'));
    act(() => result.current.setAmount(TRANSPORT, '40000'));

    expect(result.current.assigned).toBe(100_000);
    expect(result.current.unassigned).toBe(100_000);
    expect(result.current.isOverAllocated).toBe(false);
  });

  it('flags over-allocation once the envelopes promise more than exists', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '250000'));

    expect(result.current.unassigned).toBe(-50_000);
    expect(result.current.isOverAllocated).toBe(true);
  });

  it('strips non-digits from typed amounts', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '60 000abc'));

    expect(result.current.amounts[FOOD]).toBe('60000');
  });

  it('drops the whole remainder into one envelope on request', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '150000'));
    act(() => result.current.distributeRemainder(TRANSPORT));

    expect(result.current.amounts[TRANSPORT]).toBe('50000');
    expect(result.current.unassigned).toBe(0);
  });

  it('does nothing when asked to distribute an already-negative remainder', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '250000'));
    act(() => result.current.distributeRemainder(TRANSPORT));

    expect(result.current.amounts[TRANSPORT]).toBeUndefined();
  });

  it('recomputes unassigned when the total changes', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '100000'));
    act(() => result.current.setTotalInput('300000'));

    expect(result.current.unassigned).toBe(200_000);
  });

  it('falls back to the derived total when the field is cleared', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.useDerivedTotal());

    expect(result.current.totalInput).toBe('');
    expect(result.current.totalBudget).toBe(260_000);
  });
});

describe('useBudgetPlanner — shortcuts', () => {
  it('applies history-based suggestions into the draft', async () => {
    mockedSuggest.mockResolvedValue(
      new Map([
        [FOOD, 55_000],
        [TRANSPORT, 18_000],
      ]),
    );
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.applySuggestions());

    expect(result.current.amounts[FOOD]).toBe('55000');
    expect(result.current.amounts[TRANSPORT]).toBe('18000');
  });

  it('copies last month into the draft without writing anything yet', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedGetBudgets.mockResolvedValue([
      {
        id: 9,
        month: '2026-07',
        categoryId: FOOD,
        allocatedAmount: 70_000,
        rolloverEnabled: true,
        createdAt: '',
      },
    ]);

    await act(async () => {
      await result.current.copyFromLastMonth();
    });

    expect(mockedGetBudgets).toHaveBeenLastCalledWith('2026-07');
    expect(result.current.amounts[FOOD]).toBe('70000');
    expect(result.current.rollovers[FOOD]).toBe(true);
    // Still a draft — nothing persisted until save().
    expect(mockedSetBudget).not.toHaveBeenCalled();
  });
});

describe('useBudgetPlanner — saving', () => {
  it('persists the explicit total and every envelope', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '60000'));

    let ok = false;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(true);
    expect(mockedSetTotal).toHaveBeenCalledWith('2026-08', 200_000);
    expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 60_000, false);
  });

  it('writes a zero for a cleared field, so the envelope is actually emptied', async () => {
    mockedGetBudgets.mockResolvedValue([
      {
        id: 1,
        month: '2026-08',
        categoryId: FOOD,
        allocatedAmount: 60_000,
        rolloverEnabled: false,
        createdAt: '',
      },
    ]);
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, ''));
    await act(async () => {
      await result.current.save();
    });

    expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 0, false);
  });

  it('clears the explicit total when the field is blank', async () => {
    setup({ isExplicit: false, totalBudget: 260_000 });
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.save();
    });

    expect(mockedSetTotal).toHaveBeenCalledWith('2026-08', null);
  });

  it('persists the rollover flag alongside the amount', async () => {
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setAmount(FOOD, '60000'));
    act(() => result.current.toggleRollover(FOOD));

    await act(async () => {
      await result.current.save();
    });

    expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', FOOD, 60_000, true);
  });

  it('reports a save failure instead of throwing', async () => {
    mockedSetTotal.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useBudgetPlanner('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.save();
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('disk full');
  });
});
