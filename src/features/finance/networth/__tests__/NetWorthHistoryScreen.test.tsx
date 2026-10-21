import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/networth/networth.snapshots', () => ({
  getSnapshots: jest.fn(),
  recalculateMonth: jest.fn().mockResolvedValue(undefined),
}));

import { NetWorthHistoryScreen } from '@/features/finance/networth/NetWorthHistoryScreen';
import * as snapshots from '@/features/finance/networth/networth.snapshots';
import type { MonthSnapshot } from '@/features/finance/networth/networth.types';

const mocked = snapshots as jest.Mocked<typeof snapshots>;

function snapshot(month: string, netWorth: number, savingsRate: number | null): MonthSnapshot {
  return {
    month,
    netWorth,
    wallets: netWorth,
    lent: 0,
    owed: 0,
    tontines: 0,
    income: 200_000,
    spending: 100_000,
    savingsRate,
    takenAt: `${month}-28T06:00:00Z`,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getSnapshots.mockResolvedValue([snapshot('2026-09', 230_000, 40), snapshot('2026-08', 150_000, null)]);
});

describe('NetWorthHistoryScreen (VS-53)', () => {
  it('lists each closed month with its net worth, its change and its savings rate', async () => {
    render(<NetWorthHistoryScreen />);

    expect(await screen.findByTestId('snapshot-2026-09')).toHaveTextContent(/230 000 FCFA/);
    expect(screen.getByText('+80 000 FCFA on the month before')).toBeTruthy();
    expect(screen.getByText('September 2026: 40% of income kept')).toBeTruthy();
    expect(screen.getByText('August 2026: no income logged')).toBeTruthy();
  });

  it('recalculates a month on purpose and re-reads the history', async () => {
    render(<NetWorthHistoryScreen />);

    fireEvent.press(await screen.findByTestId('snapshot-2026-08-recalculate'));

    await waitFor(() => expect(mocked.recalculateMonth).toHaveBeenCalledWith('2026-08'));
    await waitFor(() => expect(mocked.getSnapshots.mock.calls.length).toBeGreaterThan(1));
  });

  it('says when no month has closed yet', async () => {
    mocked.getSnapshots.mockResolvedValue([]);
    render(<NetWorthHistoryScreen />);

    expect(await screen.findByText('No month has closed yet.')).toBeTruthy();
  });
});
