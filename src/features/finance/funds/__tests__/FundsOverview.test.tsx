import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Fund, FundProgress } from '@/features/finance/funds/funds.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/features/finance/funds/funds.hooks', () => ({
  useFunds: jest.fn(),
}));

import { FundsOverview } from '@/features/finance/funds/FundsOverview';
import { useFunds } from '@/features/finance/funds/funds.hooks';

const mockedUseFunds = useFunds as jest.MockedFunction<typeof useFunds>;

const EMERGENCY: Fund = {
  id: 1,
  type: 'emergency',
  targetAmount: 500000,
  currentAmount: 320000,
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
const PROGRESS: FundProgress[] = [
  { fundId: 1, type: 'emergency', current: 320000, target: 500000, pct: 64 },
  { fundId: 2, type: 'savings', current: 80000, target: null, pct: null },
];

function mockState(over: Partial<ReturnType<typeof useFunds>>) {
  mockedUseFunds.mockReturnValue({
    funds: [EMERGENCY, SAVINGS],
    progress: PROGRESS,
    loading: false,
    error: null,
    refresh: jest.fn(),
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState({});
});

describe('FundsOverview', () => {
  it('renders both fund cards with balances and progress', async () => {
    render(<FundsOverview />);

    await screen.findByText('Emergency Fund');
    expect(screen.getByText('Savings')).toBeTruthy();
    // Emergency: "320 000 FCFA / 500 000 FCFA" and a 64% bar.
    expect(screen.getByText('320 000 FCFA / 500 000 FCFA')).toBeTruthy();
    expect(screen.getByText('64%')).toBeTruthy();
    expect(screen.getByTestId('fund-progress-1-fill').props.accessibilityValue.now).toBe(64);
  });

  it('navigates to the fund detail when a card is pressed', async () => {
    render(<FundsOverview />);
    await screen.findByText('Emergency Fund');

    fireEvent.press(screen.getByTestId('fund-card-1'));
    expect(mockPush).toHaveBeenCalledWith('/funds/1');
  });

  it('shows a loading state', () => {
    mockState({ loading: true, funds: [], progress: [] });
    render(<FundsOverview />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
