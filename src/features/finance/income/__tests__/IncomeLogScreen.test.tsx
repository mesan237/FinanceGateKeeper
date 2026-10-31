import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/features/finance/income/income.service', () => ({
  createIncome: jest.fn().mockResolvedValue(1),
  getAllIncome: jest.fn().mockResolvedValue([]),
  getIncomeBySource: jest.fn().mockResolvedValue([]),
  getIncomeByDateRange: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/features/finance/income/incomeSources.service', () => ({
  getIncomeSources: jest.fn().mockResolvedValue([
    { id: 1, key: 'salary', name: 'Salary', parentId: null, isHidden: false, sortOrder: 0 },
    { id: 2, key: 'freelance', name: 'Freelance', parentId: null, isHidden: false, sortOrder: 1 },
    { id: 3, key: 'business', name: 'Business', parentId: null, isHidden: false, sortOrder: 2 },
    { id: 6, key: 'ecommerce', name: 'E-commerce', parentId: 3, isHidden: false, sortOrder: 0 },
  ]),
}));

import { IncomeLogScreen } from '@/features/finance/income/IncomeLogScreen';
import { createIncome } from '@/features/finance/income/income.service';

const mockedCreate = createIncome as jest.MockedFunction<typeof createIncome>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IncomeLogScreen', () => {
  it('renders the amount field, the source pills, note, date, and save button', async () => {
    render(<IncomeLogScreen />);

    expect(screen.getByLabelText('Amount in FCFA')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Salary' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Freelance' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Business / side business' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New source' })).toBeTruthy();
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByTestId('income-date')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('flags each missing field when save is pressed on an empty form', () => {
    render(<IncomeLogScreen />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();

    fireEvent.press(save);

    expect(screen.getByText('Enter an amount greater than 0.')).toBeTruthy();
    expect(screen.getByText('Pick a source.')).toBeTruthy();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('clears the source error once a source is picked', async () => {
    render(<IncomeLogScreen />);
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '350000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Pick a source.')).toBeTruthy();

    fireEvent.press(await screen.findByRole('button', { name: 'Salary' }));
    expect(screen.queryByText('Pick a source.')).toBeNull();
  });

  it('lets the note field close the keyboard from its return key', () => {
    render(<IncomeLogScreen />);
    const note = screen.getByLabelText('Note');
    expect(note.props.returnKeyType).toBe('done');
    expect(note.props.submitBehavior).toBe('blurAndSubmit');
  });

  it('calls createIncome once with the entered values on save', async () => {
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '350000');
    fireEvent.press(await screen.findByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 350000, sourceId: 1 }),
    );
  });

  it('returns to Transactions after a successful save — no allocation step (VS-34)', async () => {
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '350000');
    fireEvent.press(screen.getByTestId('income-date'));
    fireEvent(screen.getByTestId('date-picker'), 'change', { type: 'set' }, new Date(2026, 5, 12));
    fireEvent.press(await screen.findByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/transactions'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not navigate when the save fails', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('boom'));
    render(<IncomeLogScreen />);

    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '350000');
    fireEvent.press(await screen.findByRole('button', { name: 'Salary' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
