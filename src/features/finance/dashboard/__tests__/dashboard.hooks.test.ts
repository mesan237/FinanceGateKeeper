import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { DashboardState } from '@/features/finance/dashboard/dashboard.types';
import { currentMonthISO } from '@/utils/formatDate';

jest.mock('@/features/finance/dashboard/dashboard.service', () => ({
  getDashboardSnapshot: jest.fn(),
}));

import { useDashboard } from '@/features/finance/dashboard/dashboard.hooks';
import * as dashboardService from '@/features/finance/dashboard/dashboard.service';

const mockedGetSnapshot = dashboardService.getDashboardSnapshot as jest.MockedFunction<
  typeof dashboardService.getDashboardSnapshot
>;

const MOCK_STATE: DashboardState = {
  todaySpending: 5000,
  zeroDay: { hasExpenses: true, zeroDayConfirmed: false },
  budget: null,
  funds: null,
  topProject: null,
};

describe('useDashboard', () => {
  beforeEach(() => {
    mockedGetSnapshot.mockResolvedValue(MOCK_STATE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches snapshot on mount with currentMonthISO and the supplied opts', async () => {
    const { result } = renderHook(() => useDashboard({ includeBudgetData: false }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetSnapshot).toHaveBeenCalledWith(currentMonthISO(), {
      includeBudgetData: false,
    });
    expect(result.current.state).toEqual(MOCK_STATE);
    expect(result.current.error).toBeNull();
  });

  it('passes includeBudgetData: true when in control mode', async () => {
    const { result } = renderHook(() => useDashboard({ includeBudgetData: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetSnapshot).toHaveBeenCalledWith(currentMonthISO(), {
      includeBudgetData: true,
    });
  });

  it('starts in loading state and clears it once resolved', async () => {
    const { result } = renderHook(() => useDashboard({ includeBudgetData: false }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('exposes refresh which re-invokes getDashboardSnapshot', async () => {
    const { result } = renderHook(() => useDashboard({ includeBudgetData: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedGetSnapshot).toHaveBeenCalledTimes(2);
  });

  it('surfaces errors into error state without throwing', async () => {
    mockedGetSnapshot.mockRejectedValueOnce(new Error('DB failure'));
    const { result } = renderHook(() => useDashboard({ includeBudgetData: false }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('DB failure');
    expect(result.current.state).toBeNull();
  });

  it('re-fetches when includeBudgetData changes', async () => {
    const { result, rerender } = renderHook(
      ({ include }: { include: boolean }) => useDashboard({ includeBudgetData: include }),
      { initialProps: { include: false } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedGetSnapshot).toHaveBeenCalledTimes(1);

    rerender({ include: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedGetSnapshot).toHaveBeenCalledTimes(2);
    expect(mockedGetSnapshot).toHaveBeenLastCalledWith(currentMonthISO(), {
      includeBudgetData: true,
    });
  });
});
