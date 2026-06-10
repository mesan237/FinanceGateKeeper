import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Debt } from '@/features/finance/debt/debt.types';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }),
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
};

function mockState(over: Partial<ReturnType<typeof useDebtDetail>> = {}) {
  mockedUseDebtDetail.mockReturnValue({
    debt: JEAN,
    loading: false,
    error: null,
    refresh: jest.fn(),
    settle: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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

  it('marks the debt settled', async () => {
    const settle = jest.fn().mockResolvedValue(undefined);
    mockState({ settle });
    render(<DebtDetail debtId={1} />);
    fireEvent.press(screen.getByRole('button', { name: 'Mark settled' }));
    await waitFor(() => expect(settle).toHaveBeenCalled());
  });

  it('hides the settle button once the debt is settled', () => {
    mockState({ debt: { ...JEAN, status: 'settled', settledAt: '2026-06-10T00:00:00.000Z' } });
    render(<DebtDetail debtId={1} />);
    expect(screen.queryByRole('button', { name: 'Mark settled' })).toBeNull();
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
