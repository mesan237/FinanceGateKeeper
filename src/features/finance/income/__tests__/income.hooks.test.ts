import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Income } from '@/features/finance/income/income.types';

jest.mock('@/features/finance/income/income.service', () => ({
  createIncome: jest.fn().mockResolvedValue(7),
  getAllIncome: jest.fn().mockResolvedValue([]),
  getIncomeBySource: jest.fn().mockResolvedValue([]),
  getIncomeByDateRange: jest.fn().mockResolvedValue([]),
}));

import { useIncomeHistory, useIncomeLog } from '@/features/finance/income/income.hooks';
import {
  createIncome,
  getAllIncome,
  getIncomeByDateRange,
  getIncomeBySource,
} from '@/features/finance/income/income.service';

const mockedCreate = createIncome as jest.MockedFunction<typeof createIncome>;
const mockedGetAll = getAllIncome as jest.MockedFunction<typeof getAllIncome>;
const mockedBySource = getIncomeBySource as jest.MockedFunction<typeof getIncomeBySource>;
const mockedByRange = getIncomeByDateRange as jest.MockedFunction<typeof getIncomeByDateRange>;

const ROW: Income = {
  id: 1,
  amount: 350000,
  source: 'salary',
  note: null,
  date: '2026-06-12',
  createdAt: '2026-06-12T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAll.mockResolvedValue([]);
  mockedBySource.mockResolvedValue([]);
  mockedByRange.mockResolvedValue([]);
});

describe('useIncomeLog', () => {
  it('keeps canSubmit false until amount > 0 and a source are set', () => {
    const { result } = renderHook(() => useIncomeLog());
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setAmount('350000'));
    expect(result.current.canSubmit).toBe(false); // no source yet

    act(() => result.current.setSource('salary'));
    expect(result.current.canSubmit).toBe(true);
  });

  it('submits a trimmed, integer-coerced payload and returns the new id', async () => {
    const { result } = renderHook(() => useIncomeLog());
    act(() => {
      result.current.setAmount('350000');
      result.current.setSource('salary');
      result.current.setNote('  June pay  ');
      result.current.setDate('2026-06-12');
    });

    let id: number | null = null;
    await act(async () => {
      id = await result.current.submit();
    });

    expect(id).toBe(7);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledWith({
      amount: 350000,
      source: 'salary',
      note: 'June pay',
      date: '2026-06-12',
      accountId: null,
    });
  });

  it('clears the form on a successful save', async () => {
    const { result } = renderHook(() => useIncomeLog());
    act(() => {
      result.current.setAmount('350000');
      result.current.setSource('salary');
      result.current.setNote('pay');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.amount).toBe('');
    expect(result.current.source).toBeNull();
    expect(result.current.note).toBe('');
  });

  it('does not call the service and surfaces an error when invalid', async () => {
    const { result } = renderHook(() => useIncomeLog());

    let id: number | null = 1;
    await act(async () => {
      id = await result.current.submit();
    });

    expect(id).toBeNull();
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });
});

describe('useIncomeHistory', () => {
  it('loads all income with no filter', async () => {
    mockedGetAll.mockResolvedValue([ROW]);
    const { result } = renderHook(() => useIncomeHistory());

    await waitFor(() => expect(result.current.income).toHaveLength(1));
    expect(mockedGetAll).toHaveBeenCalled();
  });

  it('queries by source when a source filter is set', async () => {
    mockedBySource.mockResolvedValue([ROW]);
    renderHook(() => useIncomeHistory({ source: 'salary' }));

    await waitFor(() => expect(mockedBySource).toHaveBeenCalledWith('salary'));
    expect(mockedGetAll).not.toHaveBeenCalled();
  });

  it('queries by date range when from/to are set', async () => {
    renderHook(() => useIncomeHistory({ from: '2026-06-01', to: '2026-06-30' }));

    await waitFor(() =>
      expect(mockedByRange).toHaveBeenCalledWith('2026-06-01', '2026-06-30'),
    );
  });
});
