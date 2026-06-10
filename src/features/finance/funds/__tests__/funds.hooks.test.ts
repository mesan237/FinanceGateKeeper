import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Fund, FundTransaction } from '@/features/finance/funds/funds.types';

jest.mock('@/features/finance/funds/funds.service', () => ({
  ...jest.requireActual<object>('@/features/finance/funds/funds.service'),
  getOrCreateFunds: jest.fn(),
  getFundById: jest.fn(),
  getFundTransactions: jest.fn(),
  withdrawFromFund: jest.fn(),
  updateFundTarget: jest.fn(),
}));

import { useFundDetail, useFunds } from '@/features/finance/funds/funds.hooks';
import * as fundsService from '@/features/finance/funds/funds.service';

const mockedGetOrCreate = fundsService.getOrCreateFunds as jest.MockedFunction<
  typeof fundsService.getOrCreateFunds
>;
const mockedGetById = fundsService.getFundById as jest.MockedFunction<
  typeof fundsService.getFundById
>;
const mockedGetTxns = fundsService.getFundTransactions as jest.MockedFunction<
  typeof fundsService.getFundTransactions
>;
const mockedWithdraw = fundsService.withdrawFromFund as jest.MockedFunction<
  typeof fundsService.withdrawFromFund
>;
const mockedSetTarget = fundsService.updateFundTarget as jest.MockedFunction<
  typeof fundsService.updateFundTarget
>;

const EMERGENCY: Fund = {
  id: 1,
  type: 'emergency',
  targetAmount: 500000,
  currentAmount: 250000,
  isTargetMet: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const SAVINGS: Fund = {
  id: 2,
  type: 'savings',
  targetAmount: null,
  currentAmount: 80000,
  isTargetMet: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const TXN: FundTransaction = {
  id: 1,
  fundId: 1,
  amount: 250000,
  direction: 'deposit',
  reason: 'Allocation 2026-06',
  date: '2026-06-02',
  createdAt: '2026-06-02T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOrCreate.mockResolvedValue([EMERGENCY, SAVINGS]);
  mockedGetById.mockResolvedValue(EMERGENCY);
  mockedGetTxns.mockResolvedValue([TXN]);
  mockedWithdraw.mockResolvedValue(EMERGENCY);
  mockedSetTarget.mockResolvedValue(undefined);
});

describe('useFunds', () => {
  it('loads both funds and derives their progress', async () => {
    const { result } = renderHook(() => useFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.funds).toHaveLength(2);
    expect(result.current.progress).toEqual([
      { fundId: 1, type: 'emergency', current: 250000, target: 500000, pct: 50 },
      { fundId: 2, type: 'savings', current: 80000, target: null, pct: null },
    ]);
  });

  it('re-fetches on refresh', async () => {
    const { result } = renderHook(() => useFunds());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });
    expect(mockedGetOrCreate).toHaveBeenCalledTimes(2);
  });
});

describe('useFundDetail', () => {
  it('loads the fund and its transactions', async () => {
    const { result } = renderHook(() => useFundDetail(1));

    await waitFor(() => expect(result.current.fund).not.toBeNull());
    expect(result.current.transactions).toEqual([TXN]);
    expect(mockedGetById).toHaveBeenCalledWith(1);
  });

  it('withdraw calls the service then re-fetches', async () => {
    const { result } = renderHook(() => useFundDetail(1));
    await waitFor(() => expect(result.current.fund).not.toBeNull());

    await act(async () => {
      await result.current.withdraw(20000, 'Used it');
    });
    expect(mockedWithdraw).toHaveBeenCalledWith(1, 20000, 'Used it');
    expect(mockedGetById).toHaveBeenCalledTimes(2);
  });

  it('setTarget calls the service then re-fetches', async () => {
    const { result } = renderHook(() => useFundDetail(1));
    await waitFor(() => expect(result.current.fund).not.toBeNull());

    await act(async () => {
      await result.current.setTarget(600000);
    });
    expect(mockedSetTarget).toHaveBeenCalledWith(1, 600000);
    expect(mockedGetById).toHaveBeenCalledTimes(2);
  });
});
