import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  createExpense: jest.fn().mockResolvedValue(7),
  getAllExpenses: jest.fn().mockResolvedValue([]),
  getExpensesByCategory: jest.fn().mockResolvedValue([]),
  getExpensesByDateRange: jest.fn().mockResolvedValue([]),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true },
    { id: 2, name: 'Restaurant', parentId: 1, isDefault: true },
  ]),
}));

import {
  useCategories,
  useExpenseLog,
  useTransactions,
} from '@/features/finance/expenses/expenses.hooks';
import * as service from '@/features/finance/expenses/expenses.service';

const mocked = service as jest.Mocked<typeof service>;

beforeEach(() => {
  jest.clearAllMocks();
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
  it('loads all expenses when no filter is given', async () => {
    renderHook(() => useTransactions());
    await waitFor(() => expect(mocked.getAllExpenses).toHaveBeenCalledTimes(1));
    expect(mocked.getExpensesByCategory).not.toHaveBeenCalled();
  });

  it('filters by category when a categoryId is given', async () => {
    renderHook(() => useTransactions({ categoryId: 3 }));
    await waitFor(() => expect(mocked.getExpensesByCategory).toHaveBeenCalledWith(3));
  });

  it('filters by date range when from/to are given', async () => {
    renderHook(() => useTransactions({ from: '2026-06-01', to: '2026-06-30' }));
    await waitFor(() =>
      expect(mocked.getExpensesByDateRange).toHaveBeenCalledWith('2026-06-01', '2026-06-30'),
    );
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
});
