import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/features/finance/debt/debt.service', () => ({
  createDebt: jest.fn(),
}));

import { DebtForm } from '@/features/finance/debt/DebtForm';
import * as debtService from '@/features/finance/debt/debt.service';

const mockedCreate = debtService.createDebt as jest.MockedFunction<typeof debtService.createDebt>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedCreate.mockResolvedValue(1);
});

describe('DebtForm', () => {
  it('disables save until a person and a positive amount are entered', () => {
    render(<DebtForm />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('debt-person'), 'Jean');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '15000');
    expect(save).toBeEnabled();
  });

  it('creates the debt with the entered values and the default lent direction', async () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'Jean');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '15000');
    fireEvent.changeText(screen.getByTestId('debt-due'), '2026-06-15');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        personName: 'Jean',
        amount: 15000,
        direction: 'lent',
        dueDate: '2026-06-15',
        note: null,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/debt'));
  });

  it('records the chosen owed direction', async () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'Awa');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '40000');
    fireEvent.press(screen.getByTestId('debt-direction-owed'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ personName: 'Awa', amount: 40000, direction: 'owed' }),
      ),
    );
  });

  it('does not save a zero amount', () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'X');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '0');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
