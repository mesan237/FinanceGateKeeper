import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccountById: jest.fn(),
  getAccountBalance: jest.fn(),
  getAccountHistory: jest.fn(),
  getAccountStats: jest.fn(),
  confirmBalance: jest.fn().mockResolvedValue(undefined),
  removeBalanceCheck: jest.fn().mockResolvedValue(undefined),
  hideAccount: jest.fn().mockResolvedValue(undefined),
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

  describe('balance checks (VS-42)', () => {
    it('confirms what the wallet actually holds, starting from the computed balance', async () => {
      render(<AccountDetail accountId={1} />);
      await waitFor(() => expect(screen.getByText('3 000 FCFA')).toBeTruthy());

      fireEvent.press(screen.getByTestId('confirm-balance-button'));
      const input = await screen.findByTestId('confirm-balance-amount');
      expect(input.props.value).toBe('3 000');

      fireEvent.changeText(input, '2500');
      fireEvent.press(screen.getByTestId('confirm-balance-save'));

      await waitFor(() => expect(mocked.confirmBalance).toHaveBeenCalledWith(1, 2500));
      // The screen re-reads the balance once the check is saved.
      await waitFor(() => expect(mocked.getAccountBalance).toHaveBeenCalledTimes(2));
    });

    it('shows a balance check in the history with the correction it made', async () => {
      mocked.getAccountHistory.mockResolvedValue([
        { kind: 'balance_check', refId: 7, label: 'Balance confirmed: 1 500 FCFA', amount: -1500, date: '2026-06-11' },
        ...HISTORY,
      ]);
      render(<AccountDetail accountId={1} />);

      expect(await screen.findByText('Balance confirmed: 1 500 FCFA')).toBeTruthy();
      expect(screen.getByTestId('history-amount-balance_check-7')).toHaveTextContent('−1 500 FCFA');
    });

    it('removes a balance check after confirmation', async () => {
      mocked.getAccountHistory.mockResolvedValue([
        { kind: 'balance_check', refId: 7, label: 'Balance confirmed: 1 500 FCFA', amount: 0, date: '2026-06-11' },
      ]);
      render(<AccountDetail accountId={1} />);

      fireEvent.press(await screen.findByText('Balance confirmed: 1 500 FCFA'));
      fireEvent.press(await screen.findByTestId('remove-check-confirm'));

      await waitFor(() => expect(mocked.removeBalanceCheck).toHaveBeenCalledWith(7));
    });
  });

  it('opens a transfer from the history for editing (VS-43)', async () => {
    render(<AccountDetail accountId={1} />);

    fireEvent.press(await screen.findByText('Transfer to MTN MoMo'));

    expect(mockPush).toHaveBeenCalledWith('/transfers/12');
  });
});

describe('AccountDetail — hiding a wallet (device build, 2026-10-26)', () => {
  const MTN: Account = { ...CASH, id: 2, name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', isDefault: false };

  it('hides a wallet after a confirmation that says its history stays', async () => {
    mocked.getAccountById.mockResolvedValue(MTN);
    render(<AccountDetail accountId={2} />);

    fireEvent.press(await screen.findByTestId('hide-account-button'));
    expect(screen.getByText(/Its history stays/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('hide-account-confirm'));

    await waitFor(() => expect(mocked.hideAccount).toHaveBeenCalledWith(2));
    expect(mockBack).toHaveBeenCalled();
  });

  it('keeps the wallet when the confirmation is cancelled', async () => {
    mocked.getAccountById.mockResolvedValue(MTN);
    render(<AccountDetail accountId={2} />);

    fireEvent.press(await screen.findByTestId('hide-account-button'));
    fireEvent.press(screen.getByTestId('hide-account-cancel'));

    expect(mocked.hideAccount).not.toHaveBeenCalled();
  });

  it('does not hide the default wallet, and says how to change the default', async () => {
    render(<AccountDetail accountId={1} />);

    await screen.findByText('3 000 FCFA');
    expect(screen.queryByTestId('hide-account-button')).toBeNull();
    expect(screen.getByTestId('hide-account-default-hint')).toHaveTextContent(
      'This is your default wallet. To hide it, make another wallet the default first (Edit).',
    );
  });
});
