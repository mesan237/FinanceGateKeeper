import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { BudgetOverview } from '@/features/finance/budget/budget.types';

jest.mock('@/features/finance/budget/budget.plan', () => ({
  getBudgetOverview: jest.fn(),
  checkCategoryBudget: jest.fn(),
}));

jest.mock('@/features/finance/budget/budget.envelopes', () => ({
  setCategoryBudget: jest.fn(),
  removeCategoryBudget: jest.fn(),
  moveBudget: jest.fn(),
}));

import {
  useBudgetOverview,
  useCategoryOverBudgetCheck,
  useEnvelopeActions,
} from '@/features/finance/budget/budget.envelope.hooks';
import * as envelopes from '@/features/finance/budget/budget.envelopes';
import * as plan from '@/features/finance/budget/budget.plan';

const mockedGetOverview = plan.getBudgetOverview as jest.MockedFunction<
  typeof plan.getBudgetOverview
>;
const mockedCheckCategory = plan.checkCategoryBudget as jest.MockedFunction<
  typeof plan.checkCategoryBudget
>;
const mockedSetBudget = envelopes.setCategoryBudget as jest.MockedFunction<
  typeof envelopes.setCategoryBudget
>;
const mockedRemove = envelopes.removeCategoryBudget as jest.MockedFunction<
  typeof envelopes.removeCategoryBudget
>;
const mockedMove = envelopes.moveBudget as jest.MockedFunction<typeof envelopes.moveBudget>;

function overviewFixture(overrides: Partial<BudgetOverview> = {}): BudgetOverview {
  return {
    month: '2026-08',
    plan: {
      month: '2026-08',
      totalBudget: 300_000,
      isExplicit: true,
      derivedTotal: 260_000,
      assigned: 200_000,
      unassigned: 100_000,
      isOverAllocated: false,
    },
    categories: [],
    totalCarried: 0,
    available: 300_000,
    spent: 100_000,
    remaining: 200_000,
    consumedPct: 33.3,
    dailyAverage: 10_000,
    projected: 310_000,
    expectedToDate: 100_000,
    safeDailySpend: 9_523,
    daysElapsed: 10,
    daysRemaining: 21,
    health: 'at_risk',
    isUnplanned: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useBudgetOverview', () => {
  it('loads the overview for its month', async () => {
    mockedGetOverview.mockResolvedValue(overviewFixture());

    const { result } = renderHook(() => useBudgetOverview('2026-08'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.overview?.available).toBe(300_000);
    expect(mockedGetOverview).toHaveBeenCalledWith('2026-08');
  });

  it('re-reads on refresh, so returning to the tab sees fresh figures', async () => {
    mockedGetOverview.mockResolvedValue(overviewFixture());
    const { result } = renderHook(() => useBudgetOverview('2026-08'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedGetOverview.mockResolvedValue(overviewFixture({ spent: 150_000 }));
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.overview?.spent).toBe(150_000);
  });

  it('reloads when the month changes', async () => {
    mockedGetOverview.mockResolvedValue(overviewFixture());
    const { rerender } = renderHook((props: { month: string }) => useBudgetOverview(props.month), {
      initialProps: { month: '2026-08' },
    });
    await waitFor(() => expect(mockedGetOverview).toHaveBeenCalledWith('2026-08'));

    rerender({ month: '2026-07' });

    await waitFor(() => expect(mockedGetOverview).toHaveBeenCalledWith('2026-07'));
  });

  it('surfaces a load failure as an error, not a crash', async () => {
    mockedGetOverview.mockRejectedValue(new Error('db is down'));

    const { result } = renderHook(() => useBudgetOverview('2026-08'));

    await waitFor(() => expect(result.current.error).toBe('db is down'));
    expect(result.current.overview).toBeNull();
  });
});

describe('useEnvelopeActions', () => {
  it('sets an envelope amount and rollover flag', async () => {
    mockedSetBudget.mockResolvedValue();
    const { result } = renderHook(() => useEnvelopeActions('2026-08'));

    let ok = false;
    await act(async () => {
      ok = await result.current.setBudget(1, 60_000, true);
    });

    expect(ok).toBe(true);
    expect(mockedSetBudget).toHaveBeenCalledWith('2026-08', 1, 60_000, true);
  });

  it('removes an envelope', async () => {
    mockedRemove.mockResolvedValue();
    const { result } = renderHook(() => useEnvelopeActions('2026-08'));

    await act(async () => {
      await result.current.remove(1);
    });

    expect(mockedRemove).toHaveBeenCalledWith('2026-08', 1);
  });

  it('covers an overspend by moving budget between envelopes', async () => {
    mockedMove.mockResolvedValue();
    const { result } = renderHook(() => useEnvelopeActions('2026-08'));

    await act(async () => {
      await result.current.coverFrom(1, 5, 5_000);
    });

    expect(mockedMove).toHaveBeenCalledWith('2026-08', 1, 5, 5_000);
  });

  it('reports failure without throwing, so the sheet can stay open', async () => {
    mockedMove.mockRejectedValue(new Error('That category does not have enough budget to move.'));
    const { result } = renderHook(() => useEnvelopeActions('2026-08'));

    let ok = true;
    await act(async () => {
      ok = await result.current.coverFrom(1, 5, 999_999);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toMatch(/enough budget/i);
  });
});

describe('useCategoryOverBudgetCheck', () => {
  it('checks the given category and amount', async () => {
    mockedCheckCategory.mockResolvedValue({
      isOver: true,
      overage: 3_000,
      remaining: 2_000,
      expenseBudget: 20_000,
      categoryId: 1,
      categoryName: 'Food',
      hasBudget: true,
    });

    const { result } = renderHook(() => useCategoryOverBudgetCheck('2026-08'));
    const check = await result.current.check(1, 5_000);

    expect(mockedCheckCategory).toHaveBeenCalledWith('2026-08', 1, 5_000);
    expect(check.categoryName).toBe('Food');
    expect(check.overage).toBe(3_000);
  });
});
