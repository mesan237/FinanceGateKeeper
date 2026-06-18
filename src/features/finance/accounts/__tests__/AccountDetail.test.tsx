import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccountById: jest.fn(),
  getAccountBalance: jest.fn(),
  getAccountHistory: jest.fn(),
  getAccountStats: jest.fn(),
}));

import { AccountDetail } from '@/features/finance/accounts/AccountDetail';
import * as service from '@/features/finance/accounts/accounts.service';
import type { Account, AccountHistoryEntry, AccountStats } from '@/features/finance/accounts/accounts.types';

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

const STATS: AccountStats = {
  accountId: 1,
  monthISO: '2026-06',
  totalIncome: 8000,
  totalExpenses: 3000,
  incomePercent: 80,
  expensePercent: 75,
};

const HISTORY: AccountHistoryEntry[] = [
  { kind: 'income', refId: 10, label: 'Salary', amount: 8000, date: '2026-06-10' },
  { kind: 'expense', refId: 11, label: 'Groceries', amount: 3000, date: '2026-06-09' },
  { kind: 'transfer_out', refId: 12, label: 'Transfer to MTN MoMo', amount: 2000, date: '2026-06-08' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccountById.mockResolvedValue(CASH);
  mocked.getAccountBalance.mockResolvedValue(3000);
  mocked.getAccountHistory.mockResolvedValue(HISTORY);
  mocked.getAccountStats.mockResolvedValue(STATS);
});

describe('AccountDetail', () => {
  it('renders the balance and stats', async () => {
    render(<AccountDetail accountId={1} />);
    await waitFor(() => expect(screen.getByText('3 000 FCFA')).toBeTruthy());
    expect(screen.getByText(/80% in/)).toBeTruthy();
    expect(screen.getByText(/75% out/)).toBeTruthy();
  });

  it('renders the transaction history for this account', async () => {
    render(<AccountDetail accountId={1} />);
    await waitFor(() => expect(screen.getByText('Salary')).toBeTruthy());
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.getByText('Transfer to MTN MoMo')).toBeTruthy();
  });

  it('navigates to the edit form when Edit is pressed', async () => {
    render(<AccountDetail accountId={1} />);
    await waitFor(() => expect(screen.getByTestId('edit-account-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('edit-account-button'));
    expect(mockPush).toHaveBeenCalledWith('/accounts/create?id=1');
  });
});
