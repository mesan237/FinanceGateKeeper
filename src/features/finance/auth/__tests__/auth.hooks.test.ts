import { act, renderHook, waitFor } from '@testing-library/react-native';
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

jest.mock('@/notifications/notifications.service', () => ({
  requestPermissions: jest.fn(),
}));

import { useAppSettings } from '@/features/finance/auth/auth.hooks';
import { requestPermissions } from '@/notifications/notifications.service';

const mockedPermissions = requestPermissions as jest.MockedFunction<typeof requestPermissions>;

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

describe('useAppSettings — completeOnboarding', () => {
  it('starts with onboardingComplete false and flips it after completeOnboarding', async () => {
    const { result } = renderHook(() => useAppSettings());

    await waitFor(() => expect(result.current.settings).not.toBeNull());
    expect(result.current.settings?.onboardingComplete).toBe(false);

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(result.current.settings?.onboardingComplete).toBe(true);
  });
});

describe('useAppSettings — enableReminder (UX-08)', () => {
  it('saves the time and turns reminders on once permission is granted', async () => {
    mockedPermissions.mockResolvedValue(true);
    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.settings).not.toBeNull());

    await act(async () => {
      expect(await result.current.enableReminder('20:30')).toBe(true);
    });

    expect(result.current.settings?.reminderTime).toBe('20:30');
    expect(result.current.settings?.notificationsEnabled).toBe(true);
  });

  it('keeps the time but leaves reminders off when permission is refused', async () => {
    mockedPermissions.mockResolvedValue(false);
    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.settings).not.toBeNull());

    await act(async () => {
      expect(await result.current.enableReminder('20:30')).toBe(false);
    });

    expect(result.current.settings?.reminderTime).toBe('20:30');
    expect(result.current.settings?.notificationsEnabled).toBe(false);
  });
});
