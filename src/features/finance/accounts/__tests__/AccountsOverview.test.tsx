import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
  getAccountStats: jest.fn(),
}));

import { AccountsOverview } from '@/features/finance/accounts/AccountsOverview';
import * as service from '@/features/finance/accounts/accounts.service';
import type { Account, AccountStats } from '@/features/finance/accounts/accounts.types';

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
const MTN: Account = { ...CASH, id: 2, name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', isDefault: false };

const STATS: AccountStats = {
  accountId: 1,
  monthISO: '2026-06',
  totalIncome: 8000,
  totalExpenses: 3000,
  incomePercent: 80,
  expensePercent: 75,
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccounts.mockResolvedValue([CASH, MTN]); // active only
  mocked.getAccountBalance.mockImplementation(async (id: number) => (id === 1 ? 5000 : 2000));
  mocked.getAccountStats.mockResolvedValue(STATS);
});

describe('AccountsOverview', () => {
  it('renders each active account with its balance and purpose badge', async () => {
    render(<AccountsOverview />);
    await waitFor(() => expect(screen.getByTestId('account-card-1')).toBeTruthy());
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('MTN MoMo')).toBeTruthy();
    expect(screen.getByText('5 000 FCFA')).toBeTruthy();
    expect(screen.getByText('Spending')).toBeTruthy();
  });

  it('navigates to create when Add account is pressed', async () => {
    render(<AccountsOverview />);
    await waitFor(() => expect(screen.getByTestId('add-account-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('add-account-button'));
    expect(mockPush).toHaveBeenCalledWith('/accounts/create');
  });

  it('navigates to the account detail when a card is tapped', async () => {
    render(<AccountsOverview />);
    await waitFor(() => expect(screen.getByTestId('account-card-2')).toBeTruthy());
    fireEvent.press(screen.getByTestId('account-card-2'));
    expect(mockPush).toHaveBeenCalledWith('/accounts/2');
  });
});
