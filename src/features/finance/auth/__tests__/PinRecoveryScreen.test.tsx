import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockResetPin = jest.fn().mockResolvedValue(undefined);
jest.mock('@/features/finance/auth/AuthProvider', () => ({
  useAuthLock: () => ({ resetPin: mockResetPin }),
}));

const mockResetLocalData = jest.fn().mockResolvedValue(undefined);
jest.mock('@/services/database', () => ({ resetLocalData: () => mockResetLocalData() }));

const mockCloud = {
  userEmail: null as string | null,
  signedIn: false,
  status: 'idle' as const,
  lastSyncedAt: null,
  error: null as string | null,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  syncNow: jest.fn(),
};
jest.mock('@/hooks/useCloudSync', () => ({ useCloudSync: () => mockCloud }));

import { PinRecoveryScreen } from '@/features/finance/auth/PinRecoveryScreen';

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockCloud.userEmail = null;
  mockCloud.signedIn = false;
  mockCloud.error = null;
  mockCloud.signIn.mockResolvedValue(true);
});

describe('PinRecoveryScreen — cloud verification', () => {
  it('shows email + password when signed out', () => {
    render(<PinRecoveryScreen onClose={onClose} />);
    expect(screen.getByTestId('recovery-email')).toBeTruthy();
    expect(screen.getByTestId('recovery-password')).toBeTruthy();
  });

  it('hides the email field and uses the account email when signed in', async () => {
    mockCloud.signedIn = true;
    mockCloud.userEmail = 'me@example.com';
    render(<PinRecoveryScreen onClose={onClose} />);
    expect(screen.queryByTestId('recovery-email')).toBeNull();

    fireEvent.changeText(screen.getByTestId('recovery-password'), 'pw123456');
    fireEvent.press(screen.getByTestId('recovery-submit'));

    await waitFor(() =>
      expect(mockCloud.signIn).toHaveBeenCalledWith('me@example.com', 'pw123456'),
    );
    expect(mockResetPin).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('signs in with entered credentials then resets the PIN', async () => {
    render(<PinRecoveryScreen onClose={onClose} />);
    fireEvent.changeText(screen.getByTestId('recovery-email'), 'me@example.com');
    fireEvent.changeText(screen.getByTestId('recovery-password'), 'pw123456');
    fireEvent.press(screen.getByTestId('recovery-submit'));

    await waitFor(() =>
      expect(mockCloud.signIn).toHaveBeenCalledWith('me@example.com', 'pw123456'),
    );
    expect(mockResetPin).toHaveBeenCalled();
  });

  it('shows an error and does not reset when verification fails', async () => {
    mockCloud.signIn.mockResolvedValue(false);
    mockCloud.error = 'Invalid login credentials';
    render(<PinRecoveryScreen onClose={onClose} />);
    fireEvent.changeText(screen.getByTestId('recovery-email'), 'me@example.com');
    fireEvent.changeText(screen.getByTestId('recovery-password'), 'wrong');
    fireEvent.press(screen.getByTestId('recovery-submit'));

    expect(await screen.findByTestId('recovery-error')).toBeTruthy();
    expect(mockResetPin).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('PinRecoveryScreen — wipe fallback', () => {
  it('wipes local data and resets the PIN after confirmation', async () => {
    render(<PinRecoveryScreen onClose={onClose} />);
    fireEvent.press(screen.getByTestId('recovery-wipe-start'));
    expect(await screen.findByTestId('recovery-wipe-confirm')).toBeTruthy();

    fireEvent.press(screen.getByTestId('recovery-wipe-confirm'));

    await waitFor(() => expect(mockResetLocalData).toHaveBeenCalled());
    expect(mockResetPin).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('can back out of the wipe confirmation', () => {
    render(<PinRecoveryScreen onClose={onClose} />);
    fireEvent.press(screen.getByTestId('recovery-wipe-start'));
    fireEvent.press(screen.getByTestId('recovery-wipe-cancel'));
    expect(screen.getByTestId('recovery-submit')).toBeTruthy();
  });
});
