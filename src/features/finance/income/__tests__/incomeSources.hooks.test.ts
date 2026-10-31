import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/features/finance/income/incomeSources.service', () => ({
  getIncomeSources: jest.fn(),
  createIncomeSource: jest.fn(),
  renameIncomeSource: jest.fn(),
  setIncomeSourceHidden: jest.fn(),
}));

jest.mock('@/services/analytics', () => ({
  trackedWrite: jest.fn((_feature: string, _action: string, write: () => Promise<unknown>) => write()),
}));

import * as service from '@/features/finance/income/incomeSources.service';
import { useIncomeSources } from '@/features/finance/income/incomeSources.hooks';
import type { IncomeSource } from '@/features/finance/income/income.types';
import { trackedWrite } from '@/services/analytics';

const mocked = service as jest.Mocked<typeof service>;

const SOURCES: IncomeSource[] = [
  { id: 1, key: 'salary', name: 'Salary', parentId: null, isHidden: false, sortOrder: 0 },
  { id: 3, key: 'business', name: 'Business', parentId: null, isHidden: false, sortOrder: 2 },
  { id: 5, key: 'other', name: 'Other', parentId: null, isHidden: true, sortOrder: 4 },
  { id: 6, key: 'ecommerce', name: 'E-commerce', parentId: 3, isHidden: false, sortOrder: 0 },
  { id: 7, key: null, name: 'Taxi', parentId: 3, isHidden: true, sortOrder: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getIncomeSources.mockResolvedValue(SOURCES);
});

describe('useIncomeSources', () => {
  it('splits the sources into top-level ones and each one’s subsources', async () => {
    const { result } = renderHook(() => useIncomeSources());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topLevel.map((s) => s.id)).toEqual([1, 3, 5]);
    expect(result.current.subsourcesOf(3).map((s) => s.id)).toEqual([6, 7]);
    expect(result.current.subsourcesOf(1)).toEqual([]);
    expect(result.current.byId(6)?.name).toBe('E-commerce');
  });

  it('adds a source, reloads, and returns its id', async () => {
    mocked.createIncomeSource.mockResolvedValue(8);
    const { result } = renderHook(() => useIncomeSources());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let id: number | null = null;
    await act(async () => {
      id = await result.current.create('Pension', null);
    });

    expect(id).toBe(8);
    expect(mocked.createIncomeSource).toHaveBeenCalledWith('Pension', null);
    expect(trackedWrite).toHaveBeenCalledWith('income_source', 'create', expect.any(Function));
    expect(mocked.getIncomeSources).toHaveBeenCalledTimes(2);
  });

  it('keeps the service’s message when a save is refused, and returns null', async () => {
    mocked.createIncomeSource.mockRejectedValue(new Error('“Pension” already exists here.'));
    const { result } = renderHook(() => useIncomeSources());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let id: number | null = 0;
    await act(async () => {
      id = await result.current.create('Pension', null);
    });

    expect(id).toBeNull();
    expect(result.current.error).toBe('“Pension” already exists here.');
  });

  it('renames and hides or shows a source, then reloads', async () => {
    const { result } = renderHook(() => useIncomeSources());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.rename(7, 'Taxi line');
      await result.current.toggleHidden(SOURCES[4]);
      await result.current.toggleHidden(SOURCES[0]);
    });

    expect(mocked.renameIncomeSource).toHaveBeenCalledWith(7, 'Taxi line');
    expect(mocked.setIncomeSourceHidden).toHaveBeenNthCalledWith(1, 7, false);
    expect(mocked.setIncomeSourceHidden).toHaveBeenNthCalledWith(2, 1, true);
    expect(trackedWrite).toHaveBeenCalledWith('income_source', 'hide', expect.any(Function));
    expect(mocked.getIncomeSources).toHaveBeenCalledTimes(4);
  });
});
