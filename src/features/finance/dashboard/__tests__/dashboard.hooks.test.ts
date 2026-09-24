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
  spendingTrend: [0, 0, 0, 0, 0, 0, 5000],
  zeroDay: { hasExpenses: true, zeroDayConfirmed: false },
  budget: null,
  cashflow: null,
  dailyPace: null,
};

describe('useDashboard', () => {
  beforeEach(() => {
    mockedGetSnapshot.mockResolvedValue(MOCK_STATE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches snapshot on mount with currentMonthISO', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetSnapshot).toHaveBeenCalledWith(currentMonthISO());
    expect(result.current.state).toEqual(MOCK_STATE);
    expect(result.current.error).toBeNull();
  });

  it('starts in loading state and clears it once resolved', async () => {
    const { result } = renderHook(() => useDashboard());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('exposes refresh which re-invokes getDashboardSnapshot', async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGetSnapshot).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedGetSnapshot).toHaveBeenCalledTimes(2);
  });

  it('surfaces errors into error state without throwing', async () => {
    mockedGetSnapshot.mockRejectedValueOnce(new Error('DB failure'));
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('DB failure');
    expect(result.current.state).toBeNull();
  });
});
