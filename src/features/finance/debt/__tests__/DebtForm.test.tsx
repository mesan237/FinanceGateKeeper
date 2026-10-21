import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

// Two wallets; Cash is the default (VS-44).
jest.mock('@/features/finance/accounts/accounts.hooks', () => ({
  useAccounts: () => ({
    accounts: [
      { id: 1, name: 'Cash', type: 'cash', purpose: 'spending', openingBalance: 0, isDefault: true, isActive: true, createdAt: '' },
      { id: 2, name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', openingBalance: 0, isDefault: false, isActive: true, createdAt: '' },
    ],
    balances: {},
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
  useDefaultAccountId: () => 1,
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
  it('lets the due date be cleared again', () => {
    render(<DebtForm />);
    fireEvent.press(screen.getByTestId('debt-due'));
    fireEvent(screen.getByTestId('date-picker'), 'onChange', { type: 'set' }, new Date(2026, 5, 15));
    fireEvent.press(screen.getByTestId('debt-due-clear'));
    expect(screen.queryByTestId('debt-due-clear')).toBeNull();
  });

  it('marks the chosen direction as selected', () => {
    render(<DebtForm />);
    expect(screen.getByTestId('debt-direction-lent').props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByTestId('debt-direction-owed'));
    expect(screen.getByTestId('debt-direction-owed').props.accessibilityState.selected).toBe(true);
  });

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
    fireEvent.press(screen.getByTestId('debt-due'));
    fireEvent(screen.getByTestId('date-picker'), 'onChange', { type: 'set' }, new Date(2026, 5, 15));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        personName: 'Jean',
        amount: 15000,
        direction: 'lent',
        dueDate: '2026-06-15',
        note: null,
        // The loan leaves the default account unless the user says otherwise (VS-44).
        accountId: 1,
        totalToRepay: null,
        schedule: null,
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

  it('saves a total to repay and shows what the loan costs (VS-54)', async () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'Microfinance');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '100000');
    fireEvent.press(screen.getByTestId('debt-direction-owed'));
    fireEvent.changeText(screen.getByTestId('debt-total'), '120000');

    expect(screen.getByText('Costs 20 000 FCFA on top of the amount')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ totalToRepay: 120000, schedule: null })),
    );
  });

  it('refuses to save a total below the amount', () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'Awa');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '100000');
    fireEvent.changeText(screen.getByTestId('debt-total'), '90000');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('sets up equal instalments and previews them (VS-54)', async () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'Microfinance');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '100000');
    fireEvent.changeText(screen.getByTestId('debt-total'), '120000');
    fireEvent.press(screen.getByRole('switch', { name: 'Pay in instalments' }));
    fireEvent.changeText(screen.getByTestId('debt-instalments'), '6');
    fireEvent.press(screen.getByTestId('debt-instalment-frequency-monthly'));

    expect(screen.getByText('6 × 20 000 FCFA')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          totalToRepay: 120000,
          schedule: { count: 6, frequency: 'monthly', firstDate: expect.any(String) },
        }),
      ),
    );
  });

  it('records a debt that moved through no account (VS-44)', async () => {
    render(<DebtForm />);
    fireEvent.changeText(screen.getByTestId('debt-person'), 'Paul');
    fireEvent.changeText(screen.getByTestId('debt-amount'), '10000');
    fireEvent.press(screen.getByRole('switch', { name: 'Through an account' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ personName: 'Paul', accountId: null })),
    );
  });
});
