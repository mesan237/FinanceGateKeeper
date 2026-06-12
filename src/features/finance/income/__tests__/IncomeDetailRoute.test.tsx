import { render, screen } from '@testing-library/react-native';
import React from 'react';

const mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/features/finance/income/income.service', () => ({
  getIncomeById: jest.fn().mockResolvedValue(null),
  updateIncome: jest.fn(),
  deleteIncome: jest.fn(),
}));

import { IncomeDetailRoute } from '@/features/finance/income/IncomeDetailRoute';

describe('IncomeDetailRoute', () => {
  it('renders the screen for a valid numeric id', async () => {
    mockParams.id = '12';
    render(<IncomeDetailRoute />);

    // Screen mounts and resolves the (mocked-missing) row.
    expect(await screen.findByText('Income not found.')).toBeTruthy();
  });

  it('rejects a non-numeric id without crashing', () => {
    mockParams.id = 'abc';
    render(<IncomeDetailRoute />);

    expect(screen.getByText('Invalid income id.')).toBeTruthy();
  });

  it('rejects a missing id', () => {
    delete mockParams.id;
    render(<IncomeDetailRoute />);

    expect(screen.getByText('Invalid income id.')).toBeTruthy();
  });
});
