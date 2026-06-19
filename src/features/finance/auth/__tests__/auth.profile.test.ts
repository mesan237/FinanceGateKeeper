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

import { getProfile, setProfile } from '@/features/finance/auth/auth.profile';

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

describe('getProfile', () => {
  it('returns an empty profile on a fresh install', async () => {
    expect(await getProfile()).toEqual({
      displayName: null,
      avatarColor: null,
      avatarEmoji: null,
    });
  });
});

describe('setProfile', () => {
  it('persists each field', async () => {
    await setProfile({ displayName: 'Abdiel', avatarColor: '#2ECC71', avatarEmoji: '😎' });
    expect(await getProfile()).toEqual({
      displayName: 'Abdiel',
      avatarColor: '#2ECC71',
      avatarEmoji: '😎',
    });
  });

  it('patches only the supplied fields', async () => {
    await setProfile({ displayName: 'Abdiel', avatarColor: '#2ECC71' });
    await setProfile({ displayName: 'Mesan' });
    expect(await getProfile()).toEqual({
      displayName: 'Mesan',
      avatarColor: '#2ECC71',
      avatarEmoji: null,
    });
  });

  it('clears a field when passed null', async () => {
    await setProfile({ avatarEmoji: '😎' });
    await setProfile({ avatarEmoji: null });
    expect((await getProfile()).avatarEmoji).toBeNull();
  });

  it('is a no-op when the patch is empty', async () => {
    await setProfile({ displayName: 'Abdiel' });
    await setProfile({});
    expect((await getProfile()).displayName).toBe('Abdiel');
  });
});
