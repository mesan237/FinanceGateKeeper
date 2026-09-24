import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import {
  changePin,
  clearPin,
  getActionBarStyle,
  getAppSettings,
  hasPin,
  setActionBarStyle,
  setNotificationsEnabled,
  setOnboardingComplete,
  setPin,
  setReminderTime,
  verifyPin,
} from '@/features/finance/auth/auth.service';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('getAppSettings', () => {
  it('creates and returns a default row on first call', async () => {
    const settings = await getAppSettings();
    expect(settings.reminderTime).toBe('21:00');
    expect(settings.notificationsEnabled).toBe(true);
    expect(settings.createdAt).toBeTruthy();
  });

  it('does not create a second row on repeat calls', async () => {
    await getAppSettings();
    await getAppSettings();
    const [{ count }] = sqlite.prepare('SELECT COUNT(*) AS count FROM users').all() as {
      count: number;
    }[];
    expect(count).toBe(1);
  });
});

describe('setReminderTime', () => {
  it('accepts valid HH:mm values', async () => {
    await setReminderTime('07:30');
    expect((await getAppSettings()).reminderTime).toBe('07:30');
  });

  it('rejects malformed times', async () => {
    await expect(setReminderTime('9pm')).rejects.toThrow();
    await expect(setReminderTime('24:00')).rejects.toThrow();
    await expect(setReminderTime('12:60')).rejects.toThrow();
  });
});

describe('setNotificationsEnabled', () => {
  it('toggles and survives a re-read', async () => {
    await setNotificationsEnabled(false);
    expect((await getAppSettings()).notificationsEnabled).toBe(false);
  });
});

describe('getActionBarStyle', () => {
  it('returns "explicit" when no users row exists yet', async () => {
    expect(await getActionBarStyle()).toBe('explicit');
  });

  it('returns the updated value after setActionBarStyle', async () => {
    await setActionBarStyle('speed_dial');
    expect(await getActionBarStyle()).toBe('speed_dial');
  });

  it('setActionBarStyle throws for an unrecognised value', async () => {
    await expect(setActionBarStyle('marquee' as never)).rejects.toThrow();
  });
});

describe('PIN', () => {
  it('reports no PIN on a fresh install', async () => {
    expect(await hasPin()).toBe(false);
  });

  it('sets a PIN and then reports one exists', async () => {
    await setPin('1234');
    expect(await hasPin()).toBe(true);
  });

  it('does not persist the raw PIN', async () => {
    await setPin('1234');
    const [row] = sqlite.prepare('SELECT pin_hash, pin_salt FROM users').all() as {
      pin_hash: string;
      pin_salt: string;
    }[];
    expect(row.pin_hash).toBeTruthy();
    expect(row.pin_hash).not.toBe('1234');
    expect(row.pin_salt).toBeTruthy();
  });

  it('verifies the correct PIN and rejects a wrong one', async () => {
    await setPin('1234');
    expect(await verifyPin('1234')).toBe(true);
    expect(await verifyPin('9999')).toBe(false);
  });

  it('returns false from verifyPin when no PIN is set', async () => {
    expect(await verifyPin('1234')).toBe(false);
  });

  it('rejects a PIN that is not four digits', async () => {
    await expect(setPin('12')).rejects.toThrow();
    await expect(setPin('12345')).rejects.toThrow();
    await expect(setPin('abcd')).rejects.toThrow();
  });

  it('changePin replaces the PIN when the current one matches', async () => {
    await setPin('1234');
    await changePin('1234', '5678');
    expect(await verifyPin('5678')).toBe(true);
    expect(await verifyPin('1234')).toBe(false);
  });

  it('changePin rejects a wrong current PIN', async () => {
    await setPin('1234');
    await expect(changePin('0000', '5678')).rejects.toThrow();
    expect(await verifyPin('1234')).toBe(true);
  });

  it('clearPin removes the PIN', async () => {
    await setPin('1234');
    await clearPin();
    expect(await hasPin()).toBe(false);
    expect(await verifyPin('1234')).toBe(false);
  });
});

describe('onboarding', () => {
  it('defaults onboardingComplete to false on a fresh row', async () => {
    expect((await getAppSettings()).onboardingComplete).toBe(false);
  });

  it('persists setOnboardingComplete(true) across a re-read', async () => {
    await setOnboardingComplete(true);
    expect((await getAppSettings()).onboardingComplete).toBe(true);
  });

  it('can be flipped back to false', async () => {
    await setOnboardingComplete(true);
    await setOnboardingComplete(false);
    expect((await getAppSettings()).onboardingComplete).toBe(false);
  });
});
