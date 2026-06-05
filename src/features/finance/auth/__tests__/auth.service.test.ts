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
  getAppSettings,
  isMonth1Complete,
  setAppMode,
  setNotificationsEnabled,
  setReminderTime,
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
    expect(settings.appMode).toBe('learning');
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

describe('setAppMode', () => {
  it('persists the mode and survives a re-read', async () => {
    await setAppMode('control');
    expect((await getAppSettings()).appMode).toBe('control');
  });

  it('rejects an invalid mode at the DB CHECK constraint', async () => {
    await expect(setAppMode('chaos' as never)).rejects.toThrow();
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

describe('isMonth1Complete', () => {
  it('is false within the first 30 days', async () => {
    await getAppSettings(); // seed the row (created_at = now)
    const tenDaysLater = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(await isMonth1Complete(tenDaysLater)).toBe(false);
  });

  it('is true after 30 days', async () => {
    await getAppSettings();
    const thirtyOneDaysLater = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
    expect(await isMonth1Complete(thirtyOneDaysLater)).toBe(true);
  });
});
