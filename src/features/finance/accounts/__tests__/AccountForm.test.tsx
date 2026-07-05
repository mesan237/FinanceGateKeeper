import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/features/finance/accounts/accounts.service', () => ({
  createAccount: jest.fn(),
  updateAccount: jest.fn(),
  getAccountById: jest.fn(),
}));

import { AccountForm } from '@/features/finance/accounts/AccountForm';
import * as service from '@/features/finance/accounts/accounts.service';
import type { Account } from '@/features/finance/accounts/accounts.types';

const mocked = service as jest.Mocked<typeof service>;

const EXISTING: Account = {
  id: 3,
  name: 'Orange Money',
  type: 'mobile_money',
  purpose: 'general',
  openingBalance: 1000,
  isDefault: false,
  isActive: true,
  createdAt: '2026-06-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mocked.createAccount.mockResolvedValue(EXISTING);
  mocked.updateAccount.mockResolvedValue(undefined);
  mocked.getAccountById.mockResolvedValue(EXISTING);
});

describe('AccountForm — create mode', () => {
  it('shows a "Cancel" header label — it is a modal entry form (VS-26 M3)', () => {
    render(<AccountForm />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('disables save until a name is entered', () => {
    render(<AccountForm />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('account-name'), 'Wave');
    expect(save).toBeEnabled();
  });

  it('creates the account with the chosen type, purpose, and a 0 balance when blank', async () => {
    render(<AccountForm />);
    fireEvent.changeText(screen.getByTestId('account-name'), 'Wave');
    fireEvent.press(screen.getByTestId('account-type-bank'));
    fireEvent.press(screen.getByTestId('account-purpose-saving'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.createAccount).toHaveBeenCalledWith({
        name: 'Wave',
        type: 'bank',
        purpose: 'saving',
        openingBalance: 0,
        isDefault: false,
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/accounts');
  });

  it('passes isDefault when the default toggle is on', async () => {
    render(<AccountForm />);
    fireEvent.changeText(screen.getByTestId('account-name'), 'Wave');
    fireEvent.press(screen.getByTestId('account-default-toggle'));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(mocked.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: true }),
      ),
    );
  });
});

describe('AccountForm — edit mode', () => {
  beforeEach(() => {
    mockParams = { id: '3' };
  });

  it('shows a back chevron, not "Cancel" — edit is a drill-down (VS-26 M3)', async () => {
    render(<AccountForm />);
    await waitFor(() => expect(screen.getByTestId('account-name').props.value).toBe('Orange Money'));
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('prefills the existing account and updates on save', async () => {
    render(<AccountForm />);
    await waitFor(() => expect(screen.getByTestId('account-name').props.value).toBe('Orange Money'));
    fireEvent.changeText(screen.getByTestId('account-name'), 'Orange Money CI');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mocked.updateAccount).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ name: 'Orange Money CI', type: 'mobile_money', purpose: 'general' }),
      ),
    );
    expect(mockBack).toHaveBeenCalled();
  });
});
