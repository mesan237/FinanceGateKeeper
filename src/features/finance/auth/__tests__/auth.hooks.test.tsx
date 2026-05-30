import { act, render, waitFor } from '@testing-library/react-native';
import Database from 'better-sqlite3';
import React from 'react';
import { Text } from 'react-native';

import {
  AuthProvider,
  COOLDOWN_MS,
  FAILED_ATTEMPT_LIMIT,
  useAuth,
} from '@/features/finance/auth/auth.hooks';
import { setPin } from '@/features/finance/auth/auth.service';
import type { AuthContextValue, AuthServiceDeps } from '@/features/finance/auth/auth.types';
import { createBetterSqliteDriver, runMigrations } from '@/services/database';
import { migrations } from '@/services/migrations';

import {
  createCountingSaltGenerator,
  createNodeHasher,
} from './test-helpers';

async function buildDeps(): Promise<{ deps: AuthServiceDeps; close: () => void }> {
  const sqlite = new Database(':memory:');
  const driver = createBetterSqliteDriver(sqlite);
  await runMigrations(driver, migrations);
  return {
    deps: {
      driver,
      hasher: createNodeHasher(),
      generateSalt: createCountingSaltGenerator(),
    },
    close: () => sqlite.close(),
  };
}

function HarnessProbe({ onValue }: { onValue: (value: AuthContextValue) => void }) {
  const value = useAuth();
  onValue(value);
  return <Text>{value.isReady ? 'ready' : 'pending'}</Text>;
}

describe('AuthProvider', () => {
  it('reports hasPin=false and isLocked=false on a fresh database', async () => {
    const { deps, close } = await buildDeps();
    let observed: AuthContextValue | null = null;
    try {
      render(
        <AuthProvider deps={deps}>
          <HarnessProbe onValue={(v) => (observed = v)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(observed?.isReady).toBe(true));
      expect(observed?.hasPin).toBe(false);
      expect(observed?.isLocked).toBe(false);
    } finally {
      close();
    }
  });

  it('reports isLocked=true on a database that already has a PIN', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    let observed: AuthContextValue | null = null;
    try {
      render(
        <AuthProvider deps={deps}>
          <HarnessProbe onValue={(v) => (observed = v)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(observed?.isReady).toBe(true));
      expect(observed?.hasPin).toBe(true);
      expect(observed?.isLocked).toBe(true);
    } finally {
      close();
    }
  });

  it('unlock(correct) flips isLocked to false and resets failedAttempts', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    let observed: AuthContextValue | null = null;
    try {
      render(
        <AuthProvider deps={deps}>
          <HarnessProbe onValue={(v) => (observed = v)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(observed?.isReady).toBe(true));

      await act(async () => {
        await observed!.unlock('9999');
      });
      expect(observed?.failedAttempts).toBe(1);
      expect(observed?.isLocked).toBe(true);

      await act(async () => {
        await observed!.unlock('1234');
      });
      expect(observed?.isLocked).toBe(false);
      expect(observed?.failedAttempts).toBe(0);
      expect(observed?.cooldownUntilMs).toBeNull();
    } finally {
      close();
    }
  });

  it('triggers a cooldown after the configured number of wrong attempts', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    let observed: AuthContextValue | null = null;
    const fakeNow = jest.fn(() => 1_000_000);
    try {
      render(
        <AuthProvider deps={deps} now={fakeNow}>
          <HarnessProbe onValue={(v) => (observed = v)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(observed?.isReady).toBe(true));

      for (let i = 0; i < FAILED_ATTEMPT_LIMIT; i += 1) {
        await act(async () => {
          await observed!.unlock('9999');
        });
      }
      expect(observed?.cooldownUntilMs).toBe(1_000_000 + COOLDOWN_MS);

      // Inside the cooldown window, even the correct PIN is refused.
      await act(async () => {
        const ok = await observed!.unlock('1234');
        expect(ok).toBe(false);
      });
      expect(observed?.isLocked).toBe(true);
    } finally {
      close();
    }
  });

  it('setupPin flips hasPin to true and unlocks the app', async () => {
    const { deps, close } = await buildDeps();
    let observed: AuthContextValue | null = null;
    try {
      render(
        <AuthProvider deps={deps}>
          <HarnessProbe onValue={(v) => (observed = v)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(observed?.isReady).toBe(true));

      await act(async () => {
        await observed!.setupPin('1234');
      });
      expect(observed?.hasPin).toBe(true);
      expect(observed?.isLocked).toBe(false);
    } finally {
      close();
    }
  });

  it('lock() puts the app back to a locked state', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    let observed: AuthContextValue | null = null;
    try {
      render(
        <AuthProvider deps={deps}>
          <HarnessProbe onValue={(v) => (observed = v)} />
        </AuthProvider>,
      );
      await waitFor(() => expect(observed?.isReady).toBe(true));

      await act(async () => {
        await observed!.unlock('1234');
      });
      expect(observed?.isLocked).toBe(false);

      act(() => {
        observed!.lock();
      });
      expect(observed?.isLocked).toBe(true);
    } finally {
      close();
    }
  });
});
