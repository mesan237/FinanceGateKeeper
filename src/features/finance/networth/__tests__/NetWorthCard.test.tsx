import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/networth/networth.compute', () => ({
  ...jest.requireActual('@/features/finance/networth/networth.compute'),
  getNetWorthAsOf: jest.fn(),
  getMonthFlows: jest.fn(),
}));
jest.mock('@/features/finance/networth/networth.snapshots', () => ({
  getSnapshots: jest.fn(),
  recalculateMonth: jest.fn(),
}));

import { NetWorthCard } from '@/features/finance/networth/NetWorthCard';
import * as compute from '@/features/finance/networth/networth.compute';
import * as snapshots from '@/features/finance/networth/networth.snapshots';
import type { MonthSnapshot } from '@/features/finance/networth/networth.types';
import i18n from '@/i18n';

const mocked = { ...compute, ...snapshots } as jest.Mocked<typeof compute & typeof snapshots>;

const SEPTEMBER: MonthSnapshot = {
  month: '2026-09',
  netWorth: 230_000,
  wallets: 230_000,
  lent: 0,
  owed: 0,
  tontines: 0,
  income: 200_000,
  spending: 120_000,
  savingsRate: 40,
  takenAt: '2026-10-01T06:00:00Z',
};

beforeAll(() => {
  jest.useFakeTimers({
    now: new Date('2026-10-21T12:00:00.000Z'),
    doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getNetWorthAsOf.mockResolvedValue({ wallets: 260_000, lent: 30_000, owed: 40_000, tontines: 0, total: 250_000 });
  mocked.getMonthFlows.mockResolvedValue({ income: 200_000, spending: 50_000 });
  mocked.getSnapshots.mockResolvedValue([SEPTEMBER]);
});

describe('NetWorthCard (VS-53)', () => {
  it('holds its place with a placeholder while the figures load (UX-16)', () => {
    mocked.getNetWorthAsOf.mockReturnValue(new Promise(() => {}));
    render(<NetWorthCard />);

    expect(screen.getByTestId('networth-skeleton')).toBeTruthy();
  });

  it('says when net worth cannot load, and "Try again" reloads it (UX-16)', async () => {
    mocked.getNetWorthAsOf.mockRejectedValue(new Error('disk'));
    render(<NetWorthCard />);

    expect(await screen.findByTestId('networth-error')).toBeTruthy();
    expect(screen.getByText("Couldn't load your net worth")).toBeTruthy();

    mocked.getNetWorthAsOf.mockResolvedValue({ wallets: 260_000, lent: 30_000, owed: 40_000, tontines: 0, total: 250_000 });
    fireEvent.press(screen.getByTestId('networth-error-retry'));

    expect(await screen.findByTestId('networth-card')).toBeTruthy();
    expect(screen.queryByTestId('networth-error')).toBeNull();
  });

  it('shows today’s net worth and what it is made of, leaving empty parts out', async () => {
    render(<NetWorthCard />);

    expect(await screen.findByTestId('networth-total')).toHaveTextContent('250 000 FCFA');
    expect(screen.getByText('Wallets 260 000 FCFA · Lent 30 000 FCFA · Owed −40 000 FCFA')).toBeTruthy();
    expect(mocked.getNetWorthAsOf).toHaveBeenCalledWith('2026-10-21');
  });

  it('compares it with the end of the last closed month', async () => {
    render(<NetWorthCard />);

    expect(await screen.findByText('Since the end of September 2026: +20 000 FCFA')).toBeTruthy();
  });

  it('says history is still to come before any month has closed', async () => {
    mocked.getSnapshots.mockResolvedValue([]);
    render(<NetWorthCard />);

    expect(await screen.findByText('History starts once a month has closed.')).toBeTruthy();
  });

  it('shows the savings rate so far and for the last closed month', async () => {
    render(<NetWorthCard />);

    expect(await screen.findByText('This month so far: 75% of income kept')).toBeTruthy();
    expect(screen.getByText('September 2026: 40% of income kept')).toBeTruthy();
  });

  it('says plainly when a month spent more than came in', async () => {
    mocked.getSnapshots.mockResolvedValue([{ ...SEPTEMBER, spending: 260_000, savingsRate: -30 }]);
    render(<NetWorthCard />);

    expect(await screen.findByText('September 2026: spent 30% more than came in')).toBeTruthy();
  });

  it('opens the history', async () => {
    render(<NetWorthCard />);

    fireEvent.press(await screen.findByTestId('networth-history'));
    expect(mockPush).toHaveBeenCalledWith('/reports/net-worth');
  });

  it('speaks French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<NetWorthCard />);

    expect(await screen.findByText('Patrimoine')).toBeTruthy();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
