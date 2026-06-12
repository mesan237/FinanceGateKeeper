import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
}));

import { WalletsCard } from '@/features/finance/dashboard/WalletsCard';
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
