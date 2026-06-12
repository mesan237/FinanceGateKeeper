import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type { Allocation } from '@/features/finance/budget/budget.types';

const mockParams: { value: { amount?: string; month?: string; incomeId?: string } } = {
  value: {},
};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams.value,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/features/finance/budget/budget.service', () => ({
  ...jest.requireActual<object>('@/features/finance/budget/budget.service'),
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
  lockAllocation: jest.fn(),
  getMonthlyBudget: jest.fn(),
  getExpensesMonthlyTotal: jest.fn(),
}));

import { AllocationFromIncomeRoute } from '@/features/finance/budget/AllocationFromIncomeRoute';
import * as budgetService from '@/features/finance/budget/budget.service';

const UNLOCKED: Allocation = {
  id: 1,
  month: '2026-06',
  emergencyFundPct: DEFAULT_ALLOCATION.emergencyFundPct,
  savingsPct: DEFAULT_ALLOCATION.savingsPct,
  projectsPct: DEFAULT_ALLOCATION.projectsPct,
  expensesPct: DEFAULT_ALLOCATION.expensesPct,
  priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
  isLocked: false,
  createdAt: '2026-06-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  (budgetService.getOrCreateCurrentAllocation as jest.Mock).mockResolvedValue(UNLOCKED);
  (budgetService.getAllocation as jest.Mock).mockResolvedValue(UNLOCKED);
});

describe('AllocationFromIncomeRoute', () => {
  it('renders AllocationScreen when amount, month and incomeId are valid', async () => {
    mockParams.value = { amount: '400000', month: '2026-06', incomeId: '42' };
    render(<AllocationFromIncomeRoute />);

    expect(await screen.findByText('Allocation')).toBeTruthy();
    // 400 000 × 65% expenses = 260 000 — proves the params reached the screen.
    expect(await screen.findByText('260 000 FCFA')).toBeTruthy();
  });

  it('renders a muted error when incomeId is missing or not a positive integer', () => {
    mockParams.value = { amount: '400000', month: '2026-06' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getByText('Invalid allocation parameters.')).toBeTruthy();

    mockParams.value = { amount: '400000', month: '2026-06', incomeId: '0' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getAllByText('Invalid allocation parameters.').length).toBeGreaterThan(0);
  });

  it('renders a muted error when amount is missing', () => {
    mockParams.value = { month: '2026-06' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getByText('Invalid allocation parameters.')).toBeTruthy();
    expect(screen.queryByText('Allocation')).toBeNull();
  });

  it('renders a muted error when amount is not a positive integer', () => {
    mockParams.value = { amount: 'abc', month: '2026-06' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getByText('Invalid allocation parameters.')).toBeTruthy();
  });

  it('renders a muted error when month is malformed', () => {
    mockParams.value = { amount: '400000', month: '2026-6' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getByText('Invalid allocation parameters.')).toBeTruthy();
  });

  it('renders a muted error when amount is zero or negative', () => {
    mockParams.value = { amount: '0', month: '2026-06' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getByText('Invalid allocation parameters.')).toBeTruthy();

    mockParams.value = { amount: '-1000', month: '2026-06' };
    render(<AllocationFromIncomeRoute />);
    expect(screen.getAllByText('Invalid allocation parameters.').length).toBeGreaterThan(0);
  });
});
