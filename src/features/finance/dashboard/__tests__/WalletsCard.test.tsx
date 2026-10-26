import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
  getBalanceFreshness: jest.fn(),
  getUnassignedSpending: jest.fn(),
}));

import { WalletsCard } from '@/features/finance/dashboard/WalletsCard';
import i18n from '@/i18n';
import * as service from '@/features/finance/accounts/accounts.service';
import type { Account } from '@/features/finance/accounts/accounts.types';

const mocked = service as jest.Mocked<typeof service>;

const CASH: Account = {
  id: 1,
  name: 'Cash',
  type: 'cash',
  purpose: 'spending',
  openingBalance: 0,
  isDefault: true,
  isActive: true,
  createdAt: '2026-06-01T00:00:00Z',
};
const MTN: Account = { ...CASH, id: 2, name: 'MTN MoMo', type: 'mobile_money', isDefault: false };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccounts.mockResolvedValue([CASH, MTN]);
  mocked.getAccountBalance.mockImplementation(async (id: number) => (id === 1 ? 5000 : 2000));
  mocked.getBalanceFreshness.mockResolvedValue({ checkedOn: '2026-10-23', daysSince: 3, unchecked: 0, stale: false });
  mocked.getUnassignedSpending.mockResolvedValue({ count: 0, total: 0 });
});

describe('WalletsCard', () => {
  it('renders one row per active account with its balance', async () => {
    render(<WalletsCard />);
    await waitFor(() => expect(screen.getByTestId('wallet-row-1')).toBeTruthy());
    expect(screen.getByTestId('wallet-row-2')).toBeTruthy();
    expect(screen.getByText('5 000 FCFA')).toBeTruthy();
    expect(screen.getByText('2 000 FCFA')).toBeTruthy();
  });

  it('navigates to the Accounts tab when tapped', async () => {
    render(<WalletsCard />);
    await waitFor(() => expect(screen.getByTestId('wallets-card')).toBeTruthy());
    fireEvent.press(screen.getByTestId('wallets-card'));
    expect(mockPush).toHaveBeenCalledWith('/accounts');
  });

  it('with no accounts, renders a set-up CTA that opens the create form', async () => {
    mocked.getAccounts.mockResolvedValue([]);
    render(<WalletsCard />);

    await waitFor(() => expect(screen.getByTestId('wallets-card-empty')).toBeTruthy());
    expect(screen.getByText('Set up your wallets →')).toBeTruthy();

    fireEvent.press(screen.getByTestId('wallets-card-empty'));
    expect(mockPush).toHaveBeenCalledWith('/accounts/create');
  });
});

describe('WalletsCard — total and freshness (F-11)', () => {
  it('adds up the wallets', async () => {
    render(<WalletsCard />);

    expect(await screen.findByTestId('wallets-total')).toHaveTextContent('Total7 000 FCFA');
  });

  it('says when the balances were last checked', async () => {
    render(<WalletsCard />);

    expect(await screen.findByTestId('wallets-freshness')).toHaveTextContent('Balances checked 3 days ago');
    expect(screen.queryByTestId('wallets-check')).toBeNull();
  });

  it('nudges to check balances not confirmed for over 30 days', async () => {
    mocked.getBalanceFreshness.mockResolvedValue({ checkedOn: '2026-09-20', daysSince: 36, unchecked: 0, stale: true });
    render(<WalletsCard />);

    expect(await screen.findByTestId('wallets-freshness')).toHaveTextContent('Balances not confirmed since 20 Sep');
    expect(screen.getByTestId('wallets-check')).toHaveTextContent('Check balances ›');
  });

  it('says when a wallet was never confirmed', async () => {
    mocked.getBalanceFreshness.mockResolvedValue({ checkedOn: null, daysSince: null, unchecked: 2, stale: true });
    render(<WalletsCard />);

    expect(await screen.findByTestId('wallets-freshness')).toHaveTextContent('Some balances were never confirmed');
  });

  it('flags spending outside every wallet', async () => {
    mocked.getUnassignedSpending.mockResolvedValue({ count: 48, total: 120_000 });
    render(<WalletsCard />);

    expect(await screen.findByTestId('wallets-unassigned')).toHaveTextContent("48 expenses aren't in any wallet");
    expect(screen.getByTestId('wallets-check')).toBeTruthy();
  });

  it('re-reads the wallets when Home comes back into focus', async () => {
    render(<WalletsCard />);
    await screen.findByTestId('wallets-total');

    await waitFor(() => expect(mocked.getAccounts.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('reads in French', async () => {
    await i18n.changeLanguage('fr');
    mocked.getBalanceFreshness.mockResolvedValue({ checkedOn: null, daysSince: null, unchecked: 2, stale: true });
    render(<WalletsCard />);

    expect(await screen.findByTestId('wallets-freshness')).toHaveTextContent('Certains soldes n’ont jamais été confirmés');
    expect(screen.getByTestId('wallets-check')).toHaveTextContent('Vérifier les soldes ›');
  });
});
