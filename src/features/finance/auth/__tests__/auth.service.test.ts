import Database from 'better-sqlite3';

import {
  getAppMode,
  hasPin,
  hashPin,
  setAppMode,
  setPin,
  verifyPin,
} from '@/features/finance/auth/auth.service';
import type { AuthServiceDeps } from '@/features/finance/auth/auth.types';
import { createBetterSqliteDriver, runMigrations } from '@/services/database';
import { migrations } from '@/services/migrations';

import {
  createCountingSaltGenerator,
  createNodeHasher,
} from './test-helpers';

async function bootstrap(): Promise<{
  deps: AuthServiceDeps;
  close: () => void;
}> {
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

describe('hashPin', () => {
  it('is deterministic for the same pin/salt', async () => {
    const hasher = createNodeHasher();
    const a = await hashPin('1234', 'salt-abc', hasher);
    const b = await hashPin('1234', 'salt-abc', hasher);
    expect(a).toBe(b);
  });

  it('produces a different hash for a different salt', async () => {
    const hasher = createNodeHasher();
    const a = await hashPin('1234', 'salt-A', hasher);
    const b = await hashPin('1234', 'salt-B', hasher);
    expect(a).not.toBe(b);
  });

  it('produces a different hash for a different pin', async () => {
    const hasher = createNodeHasher();
    const a = await hashPin('1234', 'salt-A', hasher);
    const b = await hashPin('9999', 'salt-A', hasher);
    expect(a).not.toBe(b);
  });
});

describe('hasPin / setPin / verifyPin', () => {
  it('hasPin is false before setPin and true after', async () => {
    const { deps, close } = await bootstrap();
    try {
      expect(await hasPin(deps)).toBe(false);
      await setPin('1234', deps);
      expect(await hasPin(deps)).toBe(true);
    } finally {
      close();
    }
  });

  it('verifyPin returns true for the correct pin and false otherwise', async () => {
    const { deps, close } = await bootstrap();
    try {
      await setPin('1234', deps);
      expect(await verifyPin('1234', deps)).toBe(true);
      expect(await verifyPin('0000', deps)).toBe(false);
    } finally {
      close();
    }
  });

  it('verifyPin returns false when no pin is set', async () => {
    const { deps, close } = await bootstrap();
    try {
      expect(await verifyPin('1234', deps)).toBe(false);
    } finally {
      close();
    }
  });

  it('setPin replaces the existing row instead of inserting a second one', async () => {
    const { deps, close } = await bootstrap();
    try {
      await setPin('1234', deps);
      await setPin('5678', deps);
      const rows = await deps.driver.query<{ count: number }>(
        'SELECT COUNT(*) AS count FROM users',
      );
      expect(rows[0].count).toBe(1);
      expect(await verifyPin('1234', deps)).toBe(false);
      expect(await verifyPin('5678', deps)).toBe(true);
    } finally {
      close();
    }
  });

  it('setPin rotates the salt so the hash changes even for the same pin', async () => {
    const { deps, close } = await bootstrap();
    try {
      await setPin('1234', deps);
      const first = await deps.driver.query<{ pin_hash: string }>(
        'SELECT pin_hash FROM users WHERE id = 1',
      );
      await setPin('1234', deps);
      const second = await deps.driver.query<{ pin_hash: string }>(
        'SELECT pin_hash FROM users WHERE id = 1',
      );
      expect(second[0].pin_hash).not.toBe(first[0].pin_hash);
    } finally {
      close();
    }
  });
});

describe('appMode', () => {
  it("defaults to 'learning' even before a PIN is set", async () => {
    const { deps, close } = await bootstrap();
    try {
      expect(await getAppMode(deps)).toBe('learning');
    } finally {
      close();
    }
  });

  it('setAppMode persists across reads', async () => {
    const { deps, close } = await bootstrap();
    try {
      await setPin('1234', deps);
      await setAppMode('control', deps);
      expect(await getAppMode(deps)).toBe('control');
    } finally {
      close();
    }
  });
});
