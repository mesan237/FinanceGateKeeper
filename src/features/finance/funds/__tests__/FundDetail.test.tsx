import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Fund, FundTransaction } from '@/features/finance/funds/funds.types';

jest.mock('@/features/finance/funds/funds.hooks', () => ({
  useFundDetail: jest.fn(),
}));

import { FundDetail } from '@/features/finance/funds/FundDetail';
import { useFundDetail } from '@/features/finance/funds/funds.hooks';

const mockedUseFundDetail = useFundDetail as jest.MockedFunction<typeof useFundDetail>;

const EMERGENCY: Fund = {
  id: 1,
  type: 'emergency',
  targetAmount: 500000,
  currentAmount: 320000,
  isTargetMet: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const TXNS: FundTransaction[] = [
  {
    id: 2,
    fundId: 1,
    amount: 20000,
    direction: 'withdrawal',
    reason: 'Car repair',
    date: '2026-06-04',
    createdAt: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 1,
    fundId: 1,
    amount: 340000,
    direction: 'deposit',
    reason: 'Allocation 2026-06',
    date: '2026-06-02',
    createdAt: '2026-06-02T00:00:00.000Z',
  },
];

const withdraw = jest.fn();
const setTarget = jest.fn();

function mockState(over: Partial<ReturnType<typeof useFundDetail>> = {}) {
  mockedUseFundDetail.mockReturnValue({
    fund: EMERGENCY,
    transactions: TXNS,
    loading: false,
    error: null,
    refresh: jest.fn(),
    withdraw,
    setTarget,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState();
});

describe('FundDetail', () => {
  it('renders the fund progress and transaction history', async () => {
    render(<FundDetail fundId={1} />);

    await screen.findByText('Fund');
    expect(screen.getByText('Car repair')).toBeTruthy();
    expect(screen.getByText('Allocation 2026-06')).toBeTruthy();
  });

  it('logs a withdrawal with the entered amount and reason', async () => {
    render(<FundDetail fundId={1} />);
    await screen.findByText('Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Log withdrawal' }));
    fireEvent.changeText(screen.getByTestId('withdraw-amount'), '15000');
    fireEvent.changeText(screen.getByTestId('withdraw-reason'), 'Hospital');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm withdrawal' }));

    await waitFor(() => expect(withdraw).toHaveBeenCalledWith(15000, 'Hospital'));
  });

  it('edits the target with the entered amount', async () => {
    render(<FundDetail fundId={1} />);
    await screen.findByText('Fund');

    fireEvent.press(screen.getByRole('button', { name: 'Edit target' }));
    fireEvent.changeText(screen.getByTestId('target-amount'), '600000');
    fireEvent.press(screen.getByRole('button', { name: 'Save target' }));

    await waitFor(() => expect(setTarget).toHaveBeenCalledWith(600000));
  });
});
