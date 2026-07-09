import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  getAccounts: jest.fn(),
  getAccountBalance: jest.fn(),
}));

import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
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
const MTN: Account = {
  ...CASH,
  id: 2,
  name: 'MTN MoMo',
  type: 'mobile_money',
  purpose: 'general',
  isDefault: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAccounts.mockResolvedValue([CASH, MTN]); // only active accounts
  mocked.getAccountBalance.mockResolvedValue(0);
});

describe('AccountPicker', () => {
  it('lists the active accounts and marks the default', async () => {
    render(<AccountPicker value={null} onChange={jest.fn()} />);
    fireEvent.press(await screen.findByTestId('account-picker-trigger'));

    await waitFor(() => expect(screen.getByTestId('account-picker-option-1')).toBeTruthy());
    expect(screen.getByText('Cash')).toBeTruthy();
    expect(screen.getByText('MTN MoMo')).toBeTruthy();
    // default marker only on Cash
    expect(screen.getByTestId('account-picker-badge-1')).toBeTruthy();
    expect(screen.queryByTestId('account-picker-badge-2')).toBeNull();
  });

  it('fires onChange with the selected account id', async () => {
    const onChange = jest.fn();
    render(<AccountPicker value={null} onChange={onChange} />);
    fireEvent.press(await screen.findByTestId('account-picker-trigger'));
    fireEvent.press(await screen.findByTestId('account-picker-option-2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows the selected account name on the trigger', async () => {
    render(<AccountPicker value={2} onChange={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('MTN MoMo')).toBeTruthy());
  });
});
