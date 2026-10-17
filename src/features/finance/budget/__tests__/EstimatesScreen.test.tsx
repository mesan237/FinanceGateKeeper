import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}));

jest.mock('@/features/finance/budget/budget.baseline', () => ({
  getBaseline: jest.fn(),
  saveEstimates: jest.fn().mockResolvedValue(undefined),
}));

import { EstimatesScreen } from '@/features/finance/budget/EstimatesScreen';
import * as baseline from '@/features/finance/budget/budget.baseline';

const mocked = baseline as jest.Mocked<typeof baseline>;

const EMPTY = {
  monthlyIncome: null,
  incomeRegular: null,
  payDay: null,
  monthlyEssentials: null,
  noDebts: false,
  costTypesReviewed: false,
  checklistHidden: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getBaseline.mockResolvedValue(EMPTY);
});

describe('EstimatesScreen (VS-46)', () => {
  it('saves income, its pattern, pay day and essentials, then goes back', async () => {
    render(<EstimatesScreen />);

    fireEvent.changeText(await screen.findByTestId('estimate-income'), '250000');
    fireEvent.changeText(screen.getByTestId('estimate-pay-day'), '25');
    fireEvent.changeText(screen.getByTestId('estimate-essentials'), '140000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.saveEstimates).toHaveBeenCalledWith({
        monthlyIncome: 250000,
        incomeRegular: true,
        payDay: 25,
        monthlyEssentials: 140000,
      }),
    );
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('asks for no pay day when income is irregular', async () => {
    render(<EstimatesScreen />);

    fireEvent.changeText(await screen.findByTestId('estimate-income'), '180000');
    fireEvent.press(screen.getByRole('switch', { name: 'My income arrives regularly' }));
    expect(screen.queryByTestId('estimate-pay-day')).toBeNull();
    fireEvent.changeText(screen.getByTestId('estimate-essentials'), '90000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.saveEstimates).toHaveBeenCalledWith(
        expect.objectContaining({ incomeRegular: false, payDay: null }),
      ),
    );
  });

  it('starts from the saved answers and says where they came from', async () => {
    mocked.getBaseline.mockResolvedValue({
      ...EMPTY,
      monthlyIncome: { value: 250000, source: 'user', setAt: '2026-10-01T08:00:00Z' },
      incomeRegular: true,
      payDay: 25,
      monthlyEssentials: { value: 120000, source: 'observed', setAt: '2026-10-05T08:00:00Z' },
    });
    render(<EstimatesScreen />);

    await waitFor(() => expect(screen.getByTestId('estimate-income').props.value).toBe('250 000'));
    expect(screen.getByTestId('estimate-essentials').props.value).toBe('120 000');
    expect(screen.getByText(/from your logged months/)).toBeTruthy();
  });
});
