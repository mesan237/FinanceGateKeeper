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

import { useAppSettings } from '@/features/finance/auth/auth.hooks';

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

describe('useAppSettings — daysSinceCreated', () => {
  it('reports 0 days for a freshly created install', async () => {
    const { result } = renderHook(() => useAppSettings());

    await waitFor(() => expect(result.current.settings).not.toBeNull());
    expect(result.current.daysSinceCreated).toBe(0);
  });
});
