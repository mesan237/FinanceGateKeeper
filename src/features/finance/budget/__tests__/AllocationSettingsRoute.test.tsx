import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type { Allocation } from '@/features/finance/budget/budget.types';

const mockParams: { value: { month?: string } } = { value: {} };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams.value,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/finance/budget/budget.service', () => ({
  ...jest.requireActual<object>('@/features/finance/budget/budget.service'),
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
}));

import { AllocationSettingsRoute } from '@/features/finance/budget/AllocationSettingsRoute';
import * as budgetService from '@/features/finance/budget/budget.service';

const UNLOCKED: Allocation = {
  id: 1,
  month: '2026-03',
  emergencyFundPct: DEFAULT_ALLOCATION.emergencyFundPct,
  savingsPct: DEFAULT_ALLOCATION.savingsPct,
  projectsPct: DEFAULT_ALLOCATION.projectsPct,
  expensesPct: DEFAULT_ALLOCATION.expensesPct,
  priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
  isLocked: false,
  createdAt: '2026-03-01T00:00:00.000Z',
};

const mockedGetOrCreate = budgetService.getOrCreateCurrentAllocation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOrCreate.mockResolvedValue(UNLOCKED);
  (budgetService.getAllocation as jest.Mock).mockResolvedValue(UNLOCKED);
});

describe('AllocationSettingsRoute', () => {
  it('passes the `month` param through to AllocationSettings', async () => {
    mockParams.value = { month: '2026-03' };
    render(<AllocationSettingsRoute />);

    await waitFor(() => expect(mockedGetOrCreate).toHaveBeenCalledWith('2026-03'));
  });

  it('falls back to the current month when no param is present', async () => {
    mockParams.value = {};
    render(<AllocationSettingsRoute />);

    // AllocationSettings defaults to the current month; the exact value comes
    // from currentMonthISO(), so just assert it loaded *some* month.
    await waitFor(() => expect(mockedGetOrCreate).toHaveBeenCalledTimes(1));
    expect(mockedGetOrCreate.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}$/);
  });
});
