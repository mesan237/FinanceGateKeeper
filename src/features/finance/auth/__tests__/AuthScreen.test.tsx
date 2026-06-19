import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockLock = {
  ready: true,
  pinState: 'unset' as 'unset' | 'locked' | 'unlocked',
  attemptsLeft: 3,
  cooldownUntil: null as number | null,
  setupPin: jest.fn(),
  unlock: jest.fn(),
  lock: jest.fn(),
  refresh: jest.fn(),
};

jest.mock('@/features/finance/auth/AuthProvider', () => ({
  useAuthLock: () => mockLock,
}));

jest.mock('@/features/finance/auth/PinRecoveryScreen', () => {
  const { Text } = require('react-native');
  return { PinRecoveryScreen: () => <Text>recovery-screen</Text> };
});

import { AuthScreen } from '@/features/finance/auth/AuthScreen';

function enter(pin: string) {
  for (const digit of pin) {
    fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLock.pinState = 'unset';
  mockLock.attemptsLeft = 3;
  mockLock.cooldownUntil = null;
  mockLock.setupPin.mockResolvedValue(undefined);
  mockLock.unlock.mockResolvedValue(true);
});

describe('AuthScreen — setup', () => {
  it('renders the keypad and create-PIN prompt', () => {
    render(<AuthScreen />);
    expect(screen.getByText('Create a PIN')).toBeTruthy();
    expect(screen.getByTestId('pin-key-1')).toBeTruthy();
  });

  it('asks to confirm after the first entry, then sets the PIN on a match', async () => {
    render(<AuthScreen />);
    enter('1234');
    expect(await screen.findByText('Confirm your PIN')).toBeTruthy();
    enter('1234');
    await waitFor(() => expect(mockLock.setupPin).toHaveBeenCalledWith('1234'));
  });

  it('shows an error when the confirmation does not match', async () => {
    render(<AuthScreen />);
    enter('1234');
    await screen.findByText('Confirm your PIN');
    enter('9999');
    expect(await screen.findByTestId('auth-error')).toBeTruthy();
    expect(mockLock.setupPin).not.toHaveBeenCalled();
  });

  it('does not offer "Forgot PIN?" during setup', () => {
    render(<AuthScreen />);
    expect(screen.queryByTestId('auth-forgot-pin')).toBeNull();
  });
});

describe('AuthScreen — unlock', () => {
  beforeEach(() => {
    mockLock.pinState = 'locked';
  });

  it('renders the unlock prompt', () => {
    render(<AuthScreen />);
    expect(screen.getByText('Enter your PIN')).toBeTruthy();
  });

  it('calls unlock with the entered PIN', async () => {
    render(<AuthScreen />);
    enter('1234');
    await waitFor(() => expect(mockLock.unlock).toHaveBeenCalledWith('1234'));
  });

  it('shows an error on a wrong PIN', async () => {
    mockLock.unlock.mockResolvedValue(false);
    render(<AuthScreen />);
    enter('0000');
    expect(await screen.findByTestId('auth-error')).toBeTruthy();
  });

  it('disables entry and shows a countdown while cooling down', () => {
    mockLock.cooldownUntil = Date.now() + 30_000;
    render(<AuthScreen />);
    expect(screen.getByTestId('auth-cooldown')).toBeTruthy();
    enter('1234');
    expect(mockLock.unlock).not.toHaveBeenCalled();
  });

  it('opens the recovery flow from "Forgot PIN?"', async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByTestId('auth-forgot-pin'));
    expect(await screen.findByText('recovery-screen')).toBeTruthy();
  });
});
