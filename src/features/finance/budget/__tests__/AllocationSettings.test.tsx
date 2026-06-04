import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import type { Allocation } from '@/features/finance/budget/budget.types';

jest.mock('@/features/finance/budget/budget.service', () => ({
  getOrCreateCurrentAllocation: jest.fn(),
  getAllocation: jest.fn(),
  updateAllocation: jest.fn(),
  lockAllocation: jest.fn(),
  getMonthlyBudget: jest.fn(),
}));

import { AllocationSettings } from '@/features/finance/budget/AllocationSettings';
import * as budgetService from '@/features/finance/budget/budget.service';

const mockedGetOrCreate = budgetService.getOrCreateCurrentAllocation as jest.MockedFunction<
  typeof budgetService.getOrCreateCurrentAllocation
>;
const mockedGetAllocation = budgetService.getAllocation as jest.MockedFunction<
  typeof budgetService.getAllocation
>;
const mockedUpdate = budgetService.updateAllocation as jest.MockedFunction<
  typeof budgetService.updateAllocation
>;

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

const LOCKED: Allocation = { ...UNLOCKED, isLocked: true };

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetOrCreate.mockResolvedValue(UNLOCKED);
  mockedGetAllocation.mockResolvedValue(UNLOCKED);
  mockedUpdate.mockResolvedValue(undefined);
});

describe('AllocationSettings — editable', () => {
  it('renders four numeric inputs labelled by bucket with the current values', async () => {
    render(<AllocationSettings monthISO="2026-06" />);

    await waitFor(() =>
      expect(screen.getByLabelText('Emergency Fund').props.value).toBe(
        String(DEFAULT_ALLOCATION.emergencyFundPct),
      ),
    );
    expect(screen.getByLabelText('Savings').props.value).toBe(String(DEFAULT_ALLOCATION.savingsPct));
    expect(screen.getByLabelText('Projects').props.value).toBe(String(DEFAULT_ALLOCATION.projectsPct));
    expect(screen.getByLabelText('Expenses').props.value).toBe(String(DEFAULT_ALLOCATION.expensesPct));
  });

  it('disables Save when percentages do not sum to 100, enables when they do', async () => {
    render(<AllocationSettings monthISO="2026-06" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Emergency Fund').props.value).toBe(
        String(DEFAULT_ALLOCATION.emergencyFundPct),
      ),
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled(); // defaults sum to 100

    fireEvent.changeText(screen.getByLabelText('Expenses'), '60'); // sums to 95
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Savings'), '15'); // back to 100
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('up/down arrows reorder buckets; the top up-arrow is disabled', async () => {
    render(<AllocationSettings monthISO="2026-06" />);
    // Wait for the allocation to load and the priority order to be applied.
    await waitFor(() =>
      expect(screen.getByTestId('move-emergency_fund-up').props.accessibilityState.disabled).toBe(
        true,
      ),
    );

    // Default order: emergency_fund, savings, projects, expenses.
    // Move Savings up → order becomes savings, emergency_fund, projects, expenses.
    fireEvent.press(screen.getByTestId('move-savings-up'));

    // The top row's up arrow should now be on Savings and disabled.
    await waitFor(() =>
      expect(screen.getByTestId('move-savings-up').props.accessibilityState.disabled).toBe(true),
    );

    // Verify Save still sends the new priority order.
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    expect(mockedUpdate).toHaveBeenCalledWith(
      '2026-06',
      expect.objectContaining({
        priorityOrder: ['savings', 'emergency_fund', 'projects', 'expenses'],
      }),
    );
  });
});

describe('AllocationSettings — locked', () => {
  beforeEach(() => {
    mockedGetOrCreate.mockResolvedValue(LOCKED);
    mockedGetAllocation.mockResolvedValue(LOCKED);
  });

  it('marks inputs read-only, disables arrows and Save, and shows the locked banner', async () => {
    render(<AllocationSettings monthISO="2026-06" />);

    await waitFor(() =>
      expect(screen.getByLabelText('Emergency Fund').props.editable).toBe(false),
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText(/Locked for this month/i)).toBeTruthy();
    expect(screen.getByTestId('move-savings-up').props.accessibilityState.disabled).toBe(true);
  });
});
