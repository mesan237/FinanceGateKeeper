import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/features/finance/income/income.service', () => ({
  createIncome: jest.fn().mockResolvedValue(1),
  getAllIncome: jest.fn().mockResolvedValue([]),
  getIncomeBySource: jest.fn().mockResolvedValue([]),
  getIncomeByDateRange: jest.fn().mockResolvedValue([]),
}));

import { IncomeLogScreen } from '@/features/finance/income/IncomeLogScreen';
import { createIncome } from '@/features/finance/income/income.service';

const mockedCreate = createIncome as jest.MockedFunction<typeof createIncome>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IncomeLogScreen', () => {
  it('renders the amount field, three source pills, note, date, and save button', () => {
    render(<IncomeLogScreen />);

    expect(screen.getByLabelText('Amount')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Freelance' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'E-commerce' })).toBeTruthy();
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByLabelText('Date')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('keeps save disabled until an amount and a source are set', () => {
    render(<IncomeLogScreen />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Amount'), '350000');
    expect(save).toBeDisabled(); // amount set, no source yet

    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('calls createIncome once with the entered values on save', async () => {
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount'), '350000');
    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 350000, source: 'salary' }),
    );
  });

  it('navigates to /income/allocate with amount and month after a successful save', async () => {
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount'), '350000');
    fireEvent.changeText(screen.getByLabelText('Date'), '2026-06-12');
    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/income/allocate',
        params: { amount: '350000', month: '2026-06' },
      }),
    );
  });

  it('does not navigate when the save fails', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('boom'));
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount'), '350000');
    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
