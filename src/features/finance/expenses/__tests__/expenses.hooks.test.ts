import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/transactions', () => ({ getTransactionFeed: jest.fn() }));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  createExpense: jest.fn().mockResolvedValue(7),
  getAllExpenses: jest.fn().mockResolvedValue([]),
  getExpensesByCategory: jest.fn().mockResolvedValue([]),
  getExpensesByDateRange: jest.fn().mockResolvedValue([]),
  createCategory: jest.fn().mockResolvedValue(99),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
    { id: 2, name: 'Restaurant', parentId: 1, isDefault: true, isHidden: false },
  ]),
  getDayActivityStatus: jest.fn().mockResolvedValue({
    hasExpenses: false,
    zeroDayConfirmed: false,
  }),
  confirmZeroDay: jest.fn().mockResolvedValue(undefined),
}));

import {
  useCategories,
  useExpenseLog,
  useTransactions,
  useZeroDay,
} from '@/features/finance/expenses/expenses.hooks';
import * as service from '@/features/finance/expenses/expenses.service';
import { getTransactionFeed } from '@/services/transactions';

const mocked = service as jest.Mocked<typeof service>;
const mockedGetFeed = getTransactionFeed as jest.MockedFunction<typeof getTransactionFeed>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetFeed.mockResolvedValue([]);
});

describe('useExpenseLog', () => {
  it('only allows submit once amount > 0 and a category are set', () => {
    const { result } = renderHook(() => useExpenseLog());
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setAmount('1500'));
    expect(result.current.canSubmit).toBe(false); // no category yet

    act(() => result.current.setCategoryId(1));
    expect(result.current.canSubmit).toBe(true);
  });

  it('truncates the amount and forwards the fields to createExpense', async () => {
    const { result } = renderHook(() => useExpenseLog());
    act(() => {
      result.current.setAmount('1500.9');
      result.current.setCategoryId(1);
      result.current.setSubcategoryId(2);
      result.current.setNote('  lunch  ');
    });

    let id: number | null = null;
    await act(async () => {
      id = await result.current.submit();
    });

    expect(id).toBe(7);
    expect(mocked.createExpense).toHaveBeenCalledTimes(1);
    expect(mocked.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1500,
        categoryId: 1,
        subcategoryId: 2,
        note: 'lunch',
        isRecurring: false,
      }),
    );
  });

  it('sets an error and does not call the service when invalid', async () => {
    const { result } = renderHook(() => useExpenseLog());
    let id: number | null = 99;
    await act(async () => {
      id = await result.current.submit();
    });
    expect(id).toBeNull();
    expect(mocked.createExpense).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});

describe('useTransactions', () => {
  const EXPENSE_ENTRY = {
    type: 'expense' as const,
    id: 1, amount: 1000, date: '2026-06-01',
    categoryId: 3, categoryLabel: 'Food',
    subcategoryId: null, subcategoryLabel: null, note: null,
  };
  const TRANSPORT_ENTRY = {
    type: 'expense' as const,
    id: 2, amount: 2000, date: '2026-06-01',
    categoryId: 5, categoryLabel: 'Transport',
    subcategoryId: null, subcategoryLabel: null, note: null,
  };
  const INCOME_ENTRY = {
    type: 'income' as const,
    id: 3, amount: 50000, date: '2026-06-01',
    source: 'salary', sourceLabel: 'Salary', note: null,
  };

  it('calls getTransactionFeed with the given monthISO on mount', async () => {
    renderHook(() => useTransactions('2026-06'));
    await waitFor(() => expect(mockedGetFeed).toHaveBeenCalledWith('2026-06'));
  });

  it('returns all entries when no categoryId filter is provided', async () => {
    mockedGetFeed.mockResolvedValue([EXPENSE_ENTRY, INCOME_ENTRY]);
    const { result } = renderHook(() => useTransactions('2026-06'));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries).toEqual([EXPENSE_ENTRY, INCOME_ENTRY]);
  });

  it('filters expense entries by categoryId but keeps all income entries', async () => {
    mockedGetFeed.mockResolvedValue([EXPENSE_ENTRY, TRANSPORT_ENTRY, INCOME_ENTRY]);
    const { result } = renderHook(() => useTransactions('2026-06', 3));
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries.map((e) => e.id)).toEqual([1, 3]);
  });
});

describe('useCategories', () => {
  it('exposes parents and resolves labels (subcategory, then parent fallback)', async () => {
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(1));

    expect(result.current.categories[0].name).toBe('Food');
    expect(result.current.labelFor(1, 2)).toBe('Restaurant'); // subcategory name
    expect(result.current.labelFor(1, null)).toBe('Food'); // parent fallback
  });

  it('excludes hidden parents from `categories` but keeps them in `managedCategories`', async () => {
    mocked.getAllCategories.mockResolvedValue([
      { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
      { id: 5, name: 'Archived', parentId: null, isDefault: false, isHidden: true },
    ]);
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.managedCategories).toHaveLength(2));

    expect(result.current.categories.map((c) => c.name)).toEqual(['Food']);
    expect(result.current.managedCategories.map((c) => c.name)).toEqual(['Food', 'Archived']);
  });

  it('addCategory creates then re-fetches the updated list', async () => {
    mocked.getAllCategories
      .mockResolvedValueOnce([
        { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
      ])
      .mockResolvedValueOnce([
        { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
        { id: 6, name: 'Freelance', parentId: null, isDefault: false, isHidden: false },
      ]);
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.categories).toHaveLength(1));

    await act(async () => {
      await result.current.addCategory({ name: 'Freelance', parentId: null });
    });

    expect(mocked.createCategory).toHaveBeenCalledWith({ name: 'Freelance', parentId: null });
    expect(result.current.categories.map((c) => c.name)).toEqual(['Food', 'Freelance']);
  });
});

describe('useZeroDay', () => {
  it("loads today's activity status on mount", async () => {
    mocked.getDayActivityStatus.mockResolvedValue({
      hasExpenses: true,
      zeroDayConfirmed: false,
    });
    const { result } = renderHook(() => useZeroDay());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toEqual({ hasExpenses: true, zeroDayConfirmed: false });
    expect(mocked.getDayActivityStatus).toHaveBeenCalledTimes(1);
  });

  it('confirms a zero-day and re-reads the status', async () => {
    mocked.getDayActivityStatus.mockResolvedValue({
      hasExpenses: false,
      zeroDayConfirmed: false,
    });
    const { result } = renderHook(() => useZeroDay());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocked.getDayActivityStatus.mockResolvedValue({
      hasExpenses: false,
      zeroDayConfirmed: true,
    });
    await act(async () => {
      await result.current.confirm();
    });

    expect(mocked.confirmZeroDay).toHaveBeenCalledTimes(1);
    expect(result.current.status).toEqual({ hasExpenses: false, zeroDayConfirmed: true });
  });
});
