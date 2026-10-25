import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

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

import { getPreference, setPreference } from '@/services/uiPreferences';

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
});

describe('uiPreferences (UX-14)', () => {
  it('has no value for a preference never set', async () => {
    expect(await getPreference('reports.group.wealth')).toBeNull();
  });

  it('remembers what was set', async () => {
    await setPreference('reports.group.wealth', 'open');
    expect(await getPreference('reports.group.wealth')).toBe('open');
  });

  it('replaces an earlier value', async () => {
    await setPreference('reports.group.wealth', 'open');
    await setPreference('reports.group.wealth', 'closed');
    expect(await getPreference('reports.group.wealth')).toBe('closed');
  });

  it('keeps preferences apart by key', async () => {
    await setPreference('reports.group.wealth', 'open');
    expect(await getPreference('reports.group.overTime')).toBeNull();
  });

  it('stays on this phone: the table is never synced', () => {
    expect(SYNCED_TABLES).not.toContain('ui_preferences');
    const columns = sqlite.prepare('PRAGMA table_info(ui_preferences)').all() as { name: string }[];
    expect(columns.map((c) => c.name)).toEqual(['id', 'key', 'value']);
  });
});
