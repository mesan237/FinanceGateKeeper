import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Debt } from '@/features/finance/debt/debt.types';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
}));

// Two wallets; Cash is the default (VS-44).
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

jest.mock('@/features/finance/debt/debt.hooks', () => ({
  useDebtDetail: jest.fn(),
}));

import { DebtDetail } from '@/features/finance/debt/DebtDetail';
import { useDebtDetail } from '@/features/finance/debt/debt.hooks';

const mockedUseDebtDetail = useDebtDetail as jest.MockedFunction<typeof useDebtDetail>;

const JEAN: Debt = {
  id: 1,
  personName: 'Jean',
  amount: 15000,
  direction: 'lent',
  date: '2026-06-01',
  dueDate: '2026-06-15',
  status: 'pending',
  note: 'for the taxi',
  settledAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  accountId: null,
  paid: 0,
  outstanding: 15000,
};

function mockState(over: Partial<ReturnType<typeof useDebtDetail>> = {}) {
  mockedUseDebtDetail.mockReturnValue({
    debt: JEAN,
    loading: false,
    error: null,
    refresh: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    payments: [],
    recordPayment: jest.fn().mockResolvedValue(true),
    removePayment: jest.fn().mockResolvedValue(undefined),
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState();
});

describe('DebtDetail', () => {
  it('renders the debt fields', () => {
    render(<DebtDetail debtId={1} />);
    expect(screen.getByText('Jean')).toBeTruthy();
    expect(screen.getByText('15 000 FCFA')).toBeTruthy();
    expect(screen.getByText('for the taxi')).toBeTruthy();
  });

  it('records a repayment, starting from what is still owed, through the default account (VS-44)', async () => {
    const recordPayment = jest.fn().mockResolvedValue(true);
    mockState({ recordPayment });
    render(<DebtDetail debtId={1} />);

    fireEvent.press(screen.getByRole('button', { name: 'Record repayment' }));
    expect((await screen.findByTestId('repayment-amount')).props.value).toBe('15 000');
    fireEvent.press(screen.getByTestId('repayment-save'));

    await waitFor(() =>
      expect(recordPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: 15000, accountId: 1 })),
    );
  });

  it('shows what has been repaid and what is still owed', () => {
    mockState({
      debt: { ...JEAN, paid: 5000, outstanding: 10000 },
      payments: [
        { id: 3, debtId: 1, amount: 5000, accountId: 2, date: '2026-06-05', note: null, createdAt: '' },
      ],
    });
    render(<DebtDetail debtId={1} />);

    expect(screen.getByText('Repaid 5 000 FCFA · still owed 10 000 FCFA')).toBeTruthy();
    expect(screen.getByTestId('debt-payment-3')).toHaveTextContent(/5 000 FCFA/);
    expect(screen.getByTestId('debt-payment-3')).toHaveTextContent(/MTN MoMo/);
  });

  it('removes a repayment after confirmation', async () => {
    const removePayment = jest.fn().mockResolvedValue(undefined);
    mockState({
      debt: { ...JEAN, paid: 5000, outstanding: 10000 },
      payments: [
        { id: 3, debtId: 1, amount: 5000, accountId: null, date: '2026-06-05', note: null, createdAt: '' },
      ],
      removePayment,
    });
    render(<DebtDetail debtId={1} />);

    fireEvent.press(screen.getByTestId('debt-payment-3'));
    fireEvent.press(await screen.findByTestId('remove-payment-confirm'));

    await waitFor(() => expect(removePayment).toHaveBeenCalledWith(3));
  });

  it('offers no repayment once the debt is settled', () => {
    mockState({ debt: { ...JEAN, status: 'settled', settledAt: '2026-06-10T00:00:00.000Z', outstanding: 0 } });
    render(<DebtDetail debtId={1} />);
    expect(screen.queryByRole('button', { name: 'Record repayment' })).toBeNull();
  });

  it('deletes the debt and navigates back', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    mockState({ remove });
    render(<DebtDetail debtId={1} />);
    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalled());
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
