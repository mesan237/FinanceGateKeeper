import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Account, AccountHistoryEntry, AccountStats } from '@/features/finance/accounts/accounts.types';

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountById: jest.fn(),
  getAccountBalance: jest.fn(),
  getAccountStats: jest.fn(),
  getAccountHistory: jest.fn(),
  logTransfer: jest.fn(),
}));

import {
  useAccountDetail,
  useAccountStats,
  useAccounts,
  useTransferLog,
} from '@/features/finance/accounts/accounts.hooks';
import * as service from '@/features/finance/accounts/accounts.service';

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

const HISTORY: AccountHistoryEntry[] = [
  { kind: 'income', refId: 1, label: 'Salary', amount: 8000, date: '2026-06-10' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccounts.mockResolvedValue([CASH, MTN]);
  mocked.getAccountById.mockResolvedValue(CASH);
  mocked.getAccountBalance.mockImplementation(async (id: number) => (id === 1 ? 5000 : 2000));
  mocked.getAccountStats.mockResolvedValue(STATS);
  mocked.getAccountHistory.mockResolvedValue(HISTORY);
  mocked.logTransfer.mockResolvedValue({
    id: 1,
    fromAccountId: 1,
    toAccountId: 2,
    amount: 3000,
    date: '2026-06-10',
    note: null,
    createdAt: '2026-06-10T00:00:00Z',
  });
});

describe('useAccounts', () => {
  it('loads active accounts and a balance map', async () => {
    const { result } = renderHook(() => useAccounts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toEqual([CASH, MTN]);
    expect(result.current.balances).toEqual({ 1: 5000, 2: 2000 });
  });
});

describe('useAccountDetail', () => {
  it('loads the account, its balance, and its history', async () => {
    const { result } = renderHook(() => useAccountDetail(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.account).toEqual(CASH);
    expect(result.current.balance).toBe(5000);
    expect(result.current.history).toEqual(HISTORY);
  });
});

describe('useAccountStats', () => {
  it('loads stats for the account and month', async () => {
    const { result } = renderHook(() => useAccountStats(1, '2026-06'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(service.getAccountStats).toHaveBeenCalledWith(1, '2026-06');
    expect(result.current.stats).toEqual(STATS);
  });
});

describe('useTransferLog', () => {
  it('defaults the from-account to the default account', async () => {
    const { result } = renderHook(() => useTransferLog());
    await waitFor(() => expect(result.current.fromId).toBe(1));
  });

  it('canSubmit is false when accounts match or amount is not positive', async () => {
    const { result } = renderHook(() => useTransferLog());
    await waitFor(() => expect(result.current.fromId).toBe(1));

    act(() => result.current.setToId(1)); // same as from
    act(() => result.current.setAmount('3000'));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setToId(2));
    act(() => result.current.setAmount('0'));
    expect(result.current.canSubmit).toBe(false);

    act(() => result.current.setAmount('3000'));
    expect(result.current.canSubmit).toBe(true);
  });

  it('submit calls logTransfer with the form values and returns true', async () => {
    const { result } = renderHook(() => useTransferLog());
    await waitFor(() => expect(result.current.fromId).toBe(1));
    act(() => result.current.setToId(2));
    act(() => result.current.setAmount('3000'));

    let ok = false;
    await act(async () => {
      ok = await result.current.submit();
    });
    expect(ok).toBe(true);
    expect(service.logTransfer).toHaveBeenCalledWith(1, 2, 3000, expect.any(String), undefined);
  });
});
