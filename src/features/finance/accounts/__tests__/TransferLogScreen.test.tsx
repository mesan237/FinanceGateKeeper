import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
  logTransfer: jest.fn(),
}));

import { TransferLogScreen } from '@/features/finance/accounts/TransferLogScreen';
import * as service from '@/features/finance/accounts/accounts.service';
import type { Account } from '@/features/finance/accounts/accounts.types';

const mocked = service as jest.Mocked<typeof service>;

const CASH: Account = {
  id: 1,
  name: 'Cash',
  type: 'cash',
  purpose: 'spending',
  openingBalance: 0,
  isDefault: true,
  isActive: true,
  createdAt: '2026-06-01T00:00:00Z',
};
const MTN: Account = { ...CASH, id: 2, name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', isDefault: false };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccounts.mockResolvedValue([CASH, MTN]);
  mocked.getAccountBalance.mockResolvedValue(0);
  mocked.logTransfer.mockResolvedValue({
    id: 1,
    fromAccountId: 1,
    toAccountId: 2,
    amount: 3000,
    date: '2026-06-10',
    note: null,
    createdAt: '2026-06-10T00:00:00Z',
  });
});

async function pickTo(id: number) {
  fireEvent.press(await screen.findByTestId('transfer-to-trigger'));
  fireEvent.press(await screen.findByTestId(`transfer-to-option-${id}`));
}

describe('TransferLogScreen', () => {
  it('disables save until a distinct to-account and a positive amount are set', async () => {
    render(<TransferLogScreen />);
    const save = await screen.findByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await pickTo(2);
    fireEvent.changeText(screen.getByTestId('transfer-amount'), '3000');
    expect(save).toBeEnabled();
  });

  it('shows a validation error when from and to are the same account', async () => {
    render(<TransferLogScreen />);
    await screen.findByTestId('transfer-from-trigger');
    await pickTo(1); // same as the default from-account (Cash)
    fireEvent.changeText(screen.getByTestId('transfer-amount'), '3000');
    expect(screen.getByText(/same account/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('logs the transfer and navigates back on save', async () => {
    render(<TransferLogScreen />);
    await screen.findByTestId('transfer-from-trigger');
    await pickTo(2);
    fireEvent.changeText(screen.getByTestId('transfer-amount'), '3000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.logTransfer).toHaveBeenCalledWith(1, 2, 3000, expect.any(String), undefined),
    );
    expect(mockBack).toHaveBeenCalled();
  });
});
