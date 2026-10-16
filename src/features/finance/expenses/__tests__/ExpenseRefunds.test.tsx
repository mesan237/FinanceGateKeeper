import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// Two accounts; Cash is the default.
jest.mock('@/features/finance/accounts/accounts.hooks', () => ({
  useAccounts: () => ({
    accounts: [
      { id: 1, name: 'Cash', type: 'cash', purpose: 'spending', openingBalance: 0, isDefault: true, isActive: true, createdAt: '' },
      { id: 2, name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', openingBalance: 0, isDefault: false, isActive: true, createdAt: '' },
    ],
    balances: {},
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
  useDefaultAccountId: () => 1,
}));

jest.mock('@/features/finance/expenses/expenses.refunds', () => ({
  getRefunds: jest.fn(),
  recordRefund: jest.fn().mockResolvedValue(undefined),
  removeRefund: jest.fn().mockResolvedValue(undefined),
}));

import { ExpenseRefunds } from '@/features/finance/expenses/ExpenseRefunds';
import * as refunds from '@/features/finance/expenses/expenses.refunds';

const mocked = refunds as jest.Mocked<typeof refunds>;

const REFUND = {
  id: 9,
  expenseId: 5,
  amount: 5000,
  accountId: 2,
  date: '2026-11-03',
  note: null,
  createdAt: '2026-11-03T08:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getRefunds.mockResolvedValue([]);
});

describe('ExpenseRefunds (VS-45)', () => {
  it('records a refund, starting from the whole purchase, into the purchase account', async () => {
    render(<ExpenseRefunds expenseId={5} amount={20000} accountId={2} />);

    fireEvent.press(await screen.findByRole('button', { name: 'Record refund' }));
    expect((await screen.findByTestId('refund-amount')).props.value).toBe('20 000');
    fireEvent.changeText(screen.getByTestId('refund-amount'), '5000');
    fireEvent.press(screen.getByTestId('refund-save'));

    await waitFor(() =>
      expect(mocked.recordRefund).toHaveBeenCalledWith(5, expect.objectContaining({ amount: 5000, accountId: 2 })),
    );
    // The list re-reads once the refund is saved.
    await waitFor(() => expect(mocked.getRefunds).toHaveBeenCalledTimes(2));
  });

  it('lists the refunds and what is left to refund', async () => {
    mocked.getRefunds.mockResolvedValue([REFUND]);
    render(<ExpenseRefunds expenseId={5} amount={20000} accountId={2} />);

    expect(await screen.findByTestId('expense-refund-9')).toHaveTextContent(/\+5 000 FCFA/);
    expect(screen.getByTestId('expense-refund-9')).toHaveTextContent(/MTN MoMo/);
    expect(screen.getByText('Refunded 5 000 FCFA of 20 000 FCFA')).toBeTruthy();
  });

  it('removes a refund after confirmation', async () => {
    mocked.getRefunds.mockResolvedValue([REFUND]);
    render(<ExpenseRefunds expenseId={5} amount={20000} accountId={2} />);

    fireEvent.press(await screen.findByTestId('expense-refund-9'));
    fireEvent.press(await screen.findByTestId('remove-refund-confirm'));

    await waitFor(() => expect(mocked.removeRefund).toHaveBeenCalledWith(9));
  });

  it('offers no refund once the purchase is fully refunded', async () => {
    mocked.getRefunds.mockResolvedValue([{ ...REFUND, amount: 20000 }]);
    render(<ExpenseRefunds expenseId={5} amount={20000} accountId={2} />);

    await screen.findByTestId('expense-refund-9');
    expect(screen.queryByRole('button', { name: 'Record refund' })).toBeNull();
  });
});
