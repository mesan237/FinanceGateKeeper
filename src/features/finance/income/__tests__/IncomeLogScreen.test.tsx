import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Income } from '@/features/finance/income/income.types';

jest.mock('@/features/finance/income/income.service', () => ({
  createIncome: jest.fn().mockResolvedValue(1),
  getAllIncome: jest.fn().mockResolvedValue([]),
  getIncomeBySource: jest.fn().mockResolvedValue([]),
  getIncomeByDateRange: jest.fn().mockResolvedValue([]),
}));

import { IncomeLogScreen } from '@/features/finance/income/IncomeLogScreen';
import { createIncome, getAllIncome } from '@/features/finance/income/income.service';

const mockedCreate = createIncome as jest.MockedFunction<typeof createIncome>;
const mockedGetAll = getAllIncome as jest.MockedFunction<typeof getAllIncome>;

function row(overrides: Partial<Income> = {}): Income {
  return {
    id: 1,
    amount: 350000,
    source: 'salary',
    note: null,
    date: '2026-06-12',
    createdAt: '2026-06-12T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAll.mockResolvedValue([]);
});

describe('IncomeLogScreen', () => {
  it('renders the amount field, three source pills, note, date, and save button', async () => {
    render(<IncomeLogScreen />);

    expect(screen.getByLabelText('Amount')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salary' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Freelance' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'E-commerce' })).toBeTruthy();
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByLabelText('Date')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();

    await waitFor(() => expect(mockedGetAll).toHaveBeenCalled());
  });

  it('keeps save disabled until an amount and a source are set', async () => {
    render(<IncomeLogScreen />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.changeText(screen.getByLabelText('Amount'), '350000');
    expect(save).toBeDisabled(); // amount set, no source yet

    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await waitFor(() => expect(mockedGetAll).toHaveBeenCalled());
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

  it('shows the saved entry in the recent-income list, tagged by source', async () => {
    // First load is empty; after save the refresh returns the new row.
    mockedGetAll.mockResolvedValueOnce([]).mockResolvedValue([row({ amount: 350000, source: 'salary' })]);
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount'), '350000');
    fireEvent.press(screen.getByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('350 000 FCFA')).toBeTruthy();
    expect(screen.getByText(/Salary · /)).toBeTruthy();
  });
});
