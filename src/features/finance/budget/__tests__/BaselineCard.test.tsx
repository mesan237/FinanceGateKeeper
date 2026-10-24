import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void) => useEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/budget/budget.baseline', () => ({
  getBaseline: jest.fn(),
  getBaselineChecklist: jest.fn(),
  setBaselineFact: jest.fn().mockResolvedValue(undefined),
}));

import { BaselineCard } from '@/features/finance/budget/BaselineCard';
import * as baseline from '@/features/finance/budget/budget.baseline';

const mocked = baseline as jest.Mocked<typeof baseline>;

const BASELINE = {
  monthlyIncome: null,
  incomeRegular: null,
  payDay: null,
  monthlyEssentials: null,
  noDebts: false,
  costTypesReviewed: false,
  checklistHidden: false,
};

function steps(doneKeys: string[] = []) {
  return (['balances', 'bills', 'debts', 'costTypes', 'estimates'] as const).map((key) => ({
    key,
    done: doneKeys.includes(key),
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getBaseline.mockResolvedValue(BASELINE);
  mocked.getBaselineChecklist.mockResolvedValue(steps(['balances', 'bills']));
});

describe('BaselineCard (VS-46)', () => {
  it('shows progress and what is left to set up', async () => {
    render(<BaselineCard />);

    expect(await screen.findByText('Set up your baseline')).toBeTruthy();
    expect(screen.getByText('2 of 5 done')).toBeTruthy();
    expect(screen.getByTestId('baseline-step-balances')).toHaveTextContent(/Confirm your wallet balances/);
  });

  it('opens the screen that completes a step', async () => {
    render(<BaselineCard />);

    fireEvent.press(await screen.findByTestId('baseline-open-estimates'));
    expect(mockPush).toHaveBeenCalledWith('/budget/estimates');

    fireEvent.press(screen.getByTestId('baseline-open-debts'));
    expect(mockPush).toHaveBeenCalledWith('/debt');
  });

  it('lets the user answer "no debts" and "categories look right" in place', async () => {
    render(<BaselineCard />);

    fireEvent.press(await screen.findByTestId('baseline-none-debts'));
    await waitFor(() => expect(mocked.setBaselineFact).toHaveBeenCalledWith('no_debts', 1));

    fireEvent.press(screen.getByTestId('baseline-none-costTypes'));
    await waitFor(() => expect(mocked.setBaselineFact).toHaveBeenCalledWith('cost_types_reviewed', 1));
  });

  it('can be hidden', async () => {
    render(<BaselineCard />);

    fireEvent.press(await screen.findByTestId('baseline-hide'));
    await waitFor(() => expect(mocked.setBaselineFact).toHaveBeenCalledWith('checklist_hidden', 1));
  });

  it('stays out of the way once everything is done, or once hidden', async () => {
    mocked.getBaselineChecklist.mockResolvedValue(steps(['balances', 'bills', 'debts', 'costTypes', 'estimates']));
    const { unmount } = render(<BaselineCard />);
    await waitFor(() => expect(mocked.getBaselineChecklist).toHaveBeenCalled());
    expect(screen.queryByText('Set up your baseline')).toBeNull();
    unmount();

    mocked.getBaselineChecklist.mockResolvedValue(steps());
    mocked.getBaseline.mockResolvedValue({ ...BASELINE, checklistHidden: true });
    render(<BaselineCard />);
    await waitFor(() => expect(mocked.getBaseline).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Set up your baseline')).toBeNull();
  });
});
