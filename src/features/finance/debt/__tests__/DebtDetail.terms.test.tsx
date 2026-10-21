import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Debt } from '@/features/finance/debt/debt.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
}));

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

const LOAN: Debt = {
  id: 1,
  personName: 'Microfinance',
  amount: 100_000,
  direction: 'owed',
  date: '2026-09-01',
  dueDate: null,
  status: 'pending',
  note: null,
  settledAt: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  accountId: 2,
  totalToRepay: 120_000,
  schedule: { count: 6, frequency: 'monthly', firstDate: '2026-10-01' },
  repayable: 120_000,
  paid: 20_000,
  outstanding: 100_000,
};

const payInstalment = jest.fn().mockResolvedValue(true);
const removePayment = jest.fn().mockResolvedValue(undefined);

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
  mockedUseDebtDetail.mockReturnValue({
    debt: LOAN,
    loading: false,
    error: null,
    refresh: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    payments: [
      { id: 9, debtId: 1, amount: 20_000, accountId: 2, date: '2026-10-01', note: null, createdAt: '', instalment: 1 },
    ],
    recordPayment: jest.fn().mockResolvedValue(true),
    payInstalment,
    removePayment,
  });
});

describe('DebtDetail — terms and instalments (VS-54)', () => {
  it('says what the loan costs and its equivalent monthly rate', () => {
    render(<DebtDetail debtId={1} />);

    expect(screen.getByText('Total to repay 120 000 FCFA · costs 20 000 FCFA (≈ 3.3% a month)')).toBeTruthy();
  });

  it('lists the instalments with their status', () => {
    render(<DebtDetail debtId={1} />);

    expect(screen.getByTestId('instalment-1')).toHaveTextContent(/Paid/);
    expect(screen.getByTestId('instalment-2')).toHaveTextContent(/20 000 FCFA/);
    expect(screen.getByTestId('instalment-2')).toHaveTextContent(/Upcoming/);
  });

  it('pays an instalment from the chosen wallet and day, at its amount', async () => {
    render(<DebtDetail debtId={1} />);

    fireEvent.press(screen.getByTestId('instalment-2-pay'));
    expect(screen.queryByTestId('repayment-amount')).toBeNull();
    fireEvent.press(screen.getByTestId('repayment-save'));

    await waitFor(() =>
      expect(payInstalment).toHaveBeenCalledWith(2, { amount: 20_000, accountId: 2, date: expect.any(String) }),
    );
  });

  it('undoes a paid instalment', async () => {
    render(<DebtDetail debtId={1} />);

    fireEvent.press(screen.getByTestId('instalment-1-undo'));

    await waitFor(() => expect(removePayment).toHaveBeenCalledWith(9));
  });

  it('says what a loan given earns', () => {
    mockedUseDebtDetail.mockReturnValue({
      ...mockedUseDebtDetail(1),
      debt: { ...LOAN, direction: 'lent', schedule: null, dueDate: '2026-12-01' },
    });
    render(<DebtDetail debtId={1} />);

    expect(screen.getByText('Total to receive 120 000 FCFA · earns 20 000 FCFA (≈ 6.7% a month)')).toBeTruthy();
  });
});
