import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Database from 'better-sqlite3';
import React from 'react';

import { AuthScreen } from '@/features/finance/auth/AuthScreen';
import { AuthProvider } from '@/features/finance/auth/auth.hooks';
import { setPin } from '@/features/finance/auth/auth.service';
import type { AuthServiceDeps } from '@/features/finance/auth/auth.types';
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

async function pressDigits(getByLabelText: (text: string) => any, digits: string) {
  for (const d of digits) {
    await act(async () => {
      fireEvent.press(getByLabelText(`Digit ${d}`));
    });
  }
}

describe('AuthScreen — setup flow', () => {
  it('starts on the create step when no PIN is set', async () => {
    const { deps, close } = await buildDeps();
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByTestId('auth-screen'));
      expect(screen.getByText('Create a PIN')).toBeTruthy();
    } finally {
      close();
    }
  });

  it('advances from create to confirm after 4 digits', async () => {
    const { deps, close } = await buildDeps();
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByTestId('auth-screen'));
      await pressDigits(screen.getByLabelText, '1234');
      expect(screen.getByText('Confirm your PIN')).toBeTruthy();
    } finally {
      close();
    }
  });

  it('shows an error and resets to create when the confirm PIN mismatches', async () => {
    const { deps, close } = await buildDeps();
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByTestId('auth-screen'));
      await pressDigits(screen.getByLabelText, '1234');
      await pressDigits(screen.getByLabelText, '5678');
      expect(screen.getByTestId('auth-error').props.children).toMatch(/do not match/i);
      expect(screen.getByText('Create a PIN')).toBeTruthy();
    } finally {
      close();
    }
  });

  it('persists the PIN when create and confirm match', async () => {
    const { deps, close } = await buildDeps();
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByTestId('auth-screen'));
      await pressDigits(screen.getByLabelText, '1234');
      await pressDigits(screen.getByLabelText, '1234');
      await waitFor(async () => {
        const rows = await deps.driver.query<{ count: number }>(
          'SELECT COUNT(*) AS count FROM users',
        );
        expect(rows[0].count).toBe(1);
      });
    } finally {
      close();
    }
  });
});

describe('AuthScreen — unlock flow', () => {
  it('renders the unlock prompt when a PIN already exists', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByText('Enter your PIN'));
    } finally {
      close();
    }
  });

  it('shows an inline error on wrong PIN and clears the buffer', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByText('Enter your PIN'));
      await pressDigits(screen.getByLabelText, '9999');
      await waitFor(() => {
        expect(screen.getByTestId('auth-error').props.children).toMatch(/wrong/i);
      });
    } finally {
      close();
    }
  });

  it('shows the cooldown banner after 3 wrong attempts', async () => {
    const { deps, close } = await buildDeps();
    await setPin('1234', deps);
    try {
      const screen = render(
        <AuthProvider deps={deps}>
          <AuthScreen />
        </AuthProvider>,
      );
      await waitFor(() => screen.getByText('Enter your PIN'));
      for (let i = 0; i < 3; i += 1) {
        await pressDigits(screen.getByLabelText, '9999');
      }
      await waitFor(() => screen.getByTestId('auth-cooldown'));
    } finally {
      close();
    }
  });
});
