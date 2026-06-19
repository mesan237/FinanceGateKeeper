import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

jest.mock('@/features/finance/auth/auth.service', () => ({
  hasPin: jest.fn(),
  setPin: jest.fn(),
  verifyPin: jest.fn(),
  clearPin: jest.fn(),
}));

import {
  AuthProvider,
  COOLDOWN_MS,
  MAX_ATTEMPTS,
  useAuthLock,
} from '@/features/finance/auth/AuthProvider';
import { clearPin, hasPin, setPin, verifyPin } from '@/features/finance/auth/auth.service';

const mockedHasPin = hasPin as jest.MockedFunction<typeof hasPin>;
const mockedSetPin = setPin as jest.MockedFunction<typeof setPin>;
const mockedVerifyPin = verifyPin as jest.MockedFunction<typeof verifyPin>;
const mockedClearPin = clearPin as jest.MockedFunction<typeof clearPin>;

let lock: ReturnType<typeof useAuthLock>;

function Consumer() {
  lock = useAuthLock();
  return <Text>{`${lock.ready ? 'ready' : 'loading'}:${lock.pinState}`}</Text>;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSetPin.mockResolvedValue(undefined);
  mockedClearPin.mockResolvedValue(undefined);
});

describe('AuthProvider / useAuthLock', () => {
  it('starts unset (open) when no PIN exists', async () => {
    mockedHasPin.mockResolvedValue(false);
    renderProvider();
    expect(await screen.findByText('ready:unset')).toBeTruthy();
  });

  it('starts locked when a PIN exists', async () => {
    mockedHasPin.mockResolvedValue(true);
    renderProvider();
    expect(await screen.findByText('ready:locked')).toBeTruthy();
  });

  it('setupPin creates the PIN and unlocks', async () => {
    mockedHasPin.mockResolvedValue(false);
    renderProvider();
    await screen.findByText('ready:unset');

    await act(async () => {
      await lock.setupPin('1234');
    });

    expect(mockedSetPin).toHaveBeenCalledWith('1234');
    expect(screen.getByText('ready:unlocked')).toBeTruthy();
  });

  it('unlock succeeds with the correct PIN', async () => {
    mockedHasPin.mockResolvedValue(true);
    mockedVerifyPin.mockResolvedValue(true);
    renderProvider();
    await screen.findByText('ready:locked');

    let result: boolean | undefined;
    await act(async () => {
      result = await lock.unlock('1234');
    });

    expect(result).toBe(true);
    expect(screen.getByText('ready:unlocked')).toBeTruthy();
  });

  it('counts down attempts then triggers a cooldown after 3 wrong entries', async () => {
    mockedHasPin.mockResolvedValue(true);
    mockedVerifyPin.mockResolvedValue(false);
    renderProvider();
    await screen.findByText('ready:locked');

    const before = Date.now();
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await lock.unlock('0000');
      });
    }

    expect(lock.pinState).toBe('locked');
    expect(lock.cooldownUntil).not.toBeNull();
    expect(lock.cooldownUntil!).toBeGreaterThanOrEqual(before + COOLDOWN_MS);
  });

  it('refuses to unlock while cooling down', async () => {
    mockedHasPin.mockResolvedValue(true);
    mockedVerifyPin.mockResolvedValue(false);
    renderProvider();
    await screen.findByText('ready:locked');

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await lock.unlock('0000');
      });
    }
    mockedVerifyPin.mockClear();

    let result: boolean | undefined;
    await act(async () => {
      result = await lock.unlock('1234');
    });

    expect(result).toBe(false);
    expect(mockedVerifyPin).not.toHaveBeenCalled();
  });

  it('resetPin clears the PIN and returns to setup (unset)', async () => {
    mockedHasPin.mockResolvedValue(true);
    renderProvider();
    await screen.findByText('ready:locked');

    await act(async () => {
      await lock.resetPin();
    });

    expect(mockedClearPin).toHaveBeenCalled();
    expect(screen.getByText('ready:unset')).toBeTruthy();
  });

  it('lock() re-locks an unlocked app', async () => {
    mockedHasPin.mockResolvedValue(true);
    mockedVerifyPin.mockResolvedValue(true);
    renderProvider();
    await screen.findByText('ready:locked');

    await act(async () => {
      await lock.unlock('1234');
    });
    expect(screen.getByText('ready:unlocked')).toBeTruthy();

    await act(async () => {
      lock.lock();
    });
    await waitFor(() => expect(screen.getByText('ready:locked')).toBeTruthy());
  });
});
