import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Fund } from '@/features/finance/funds/funds.types';
import type { Income } from '@/features/finance/income/income.types';
import type { Project } from '@/features/finance/projects/projects.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const mockPool = jest.fn();
jest.mock('@/features/finance/budget/budget.hooks', () => ({
  useUnallocatedPool: () => mockPool(),
}));

import { UnallocatedPoolScreen } from '@/features/finance/budget/UnallocatedPoolScreen';

const mockAllocate = jest.fn();

function income(overrides: Partial<Income> = {}): Income {
  return {
    id: 1,
    amount: 50000,
    source: 'freelance',
    note: null,
    date: '2026-06-12',
    accountId: null,
    allocationStatus: 'pending',
    createdAt: '2026-06-12T00:00:00.000Z',
    ...overrides,
  };
}

const FUNDS: Fund[] = [
  { id: 1, type: 'emergency', targetAmount: 500000, currentAmount: 0, isTargetMet: false, createdAt: '' },
  { id: 2, type: 'savings', targetAmount: 0, currentAmount: 0, isTargetMet: false, createdAt: '' },
];

const PROJECTS: Project[] = [
  {
    id: 3,
    name: 'BRVM Investment',
    targetAmount: 200000,
    fundedAmount: 0,
    priorityRank: 1,
    deadline: null,
    status: 'active',
    createdAt: '',
  },
];

function poolValue(overrides: Record<string, unknown> = {}) {
  return {
    pending: [],
    total: 0,
    funds: FUNDS,
    projects: PROJECTS,
    loading: false,
    error: null,
    allocate: mockAllocate,
    refresh: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAllocate.mockResolvedValue(undefined);
  mockPool.mockReturnValue(poolValue());
});

describe('UnallocatedPoolScreen', () => {
  it('shows the pool total and an empty state when nothing is held', () => {
    mockPool.mockReturnValue(poolValue({ pending: [], total: 0 }));
    render(<UnallocatedPoolScreen />);

    expect(screen.getByText('0 FCFA')).toBeTruthy();
    expect(screen.getByText(/Nothing held right now/i)).toBeTruthy();
  });

  it('lists pending entries and the total', () => {
    mockPool.mockReturnValue(
      poolValue({
        pending: [income({ id: 1, amount: 50000 }), income({ id: 2, amount: 30000 })],
        total: 80000,
      }),
    );
    render(<UnallocatedPoolScreen />);

    expect(screen.getByText('80 000 FCFA')).toBeTruthy();
    expect(screen.getByTestId('pending-row-1')).toBeTruthy();
    expect(screen.getByTestId('pending-row-2')).toBeTruthy();
  });

  it('allocates a held income to the expense budget after picking a destination', async () => {
    const held = income({ id: 7, amount: 50000 });
    mockPool.mockReturnValue(poolValue({ pending: [held], total: 50000 }));
    render(<UnallocatedPoolScreen />);

    fireEvent.press(screen.getByTestId('pending-row-7'));
    fireEvent.press(await screen.findByRole('button', { name: 'Expense budget' }));

    await waitFor(() =>
      expect(mockAllocate).toHaveBeenCalledWith(held, { kind: 'expense' }),
    );
  });

  it('offers fund and project destinations', async () => {
    const held = income({ id: 8, amount: 40000 });
    mockPool.mockReturnValue(poolValue({ pending: [held], total: 40000 }));
    render(<UnallocatedPoolScreen />);

    fireEvent.press(screen.getByTestId('pending-row-8'));
    fireEvent.press(await screen.findByRole('button', { name: 'BRVM Investment' }));

    await waitFor(() =>
      expect(mockAllocate).toHaveBeenCalledWith(held, { kind: 'project', projectId: 3 }),
    );
  });
});
