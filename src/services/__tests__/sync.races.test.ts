import Database from 'better-sqlite3';
import * as fakeSupabase from '@supabase/supabase-js';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

/**
 * `onExecute` runs before each statement the sync engine sends, so a test can
 * slip a user edit in between two engine writes, as the UI can on a phone.
 */
const mockState: {
  driver: SqliteDriver | null;
  onExecute: ((sql: string) => void) | null;
} = { driver: null, onExecute: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) => {
      mockState.onExecute?.(sql);
      return mockState.driver!.execute(sql, params as never);
    },
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import { pullChanges, pushChanges } from '@/services/sync';

const cloud = fakeSupabase as unknown as {
  __reset(): void;
  __seed(table: string, rows: Record<string, unknown>[]): void;
  __getTable(table: string): Record<string, unknown>[];
  __setSession(session: unknown): void;
};

let sqlite: Database.Database;

function run(sql: string, ...params: unknown[]): void {
  sqlite.prepare(sql).run(...(params as never[]));
}
function get<T>(sql: string, ...params: unknown[]): T {
  return sqlite.prepare(sql).get(...(params as never[])) as T;
}

/** Runs `edit` once, just before the first engine statement matching `pattern`. */
function editBefore(pattern: RegExp, edit: () => void): void {
  let done = false;
  mockState.onExecute = (sql) => {
    if (done || !pattern.test(sql)) return;
    done = true;
    edit();
  };
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  mockState.onExecute = null;
  await runMigrations(mockState.driver, migrations);
  cloud.__reset();
  cloud.__setSession({ user: { id: 'u1' } });
  run(
    `INSERT INTO income (amount, source, date, created_at, uuid, updated_at, sync_status)
     VALUES (100, 'salary', '2026-06-01', '2026-06-01T00:00:00.000Z',
             'inc-local', '2026-06-01T00:00:00.000Z', 'synced')`,
  );
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('edits made while a sync is running', () => {
  it('marks an edit saved during a pull pending, so the next push sends it', async () => {
    cloud.__seed('debts', [
      {
        uuid: 'debt-cloud',
        person_name: 'Awa',
        amount: 5000,
        direction: 'owed_to_me',
        date: '2026-06-02',
        status: 'open',
        created_at: '2026-06-02T00:00:00.000Z',
        updated_at: '2026-06-02T00:00:00.000Z',
      },
    ]);
    editBefore(/INSERT INTO debts/, () => run(`UPDATE income SET amount = 250 WHERE uuid = 'inc-local'`));

    await pullChanges();

    const row = get<{ sync_status: string }>(`SELECT sync_status FROM income WHERE uuid = 'inc-local'`);
    expect(row.sync_status).toBe('pending');
    await pushChanges();
    expect(cloud.__getTable('income')[0].amount).toBe(250);
  });

  it('keeps the cloud timestamp on a row the pull overwrites', async () => {
    cloud.__seed('income', [
      {
        uuid: 'inc-local',
        amount: 999,
        source: 'salary',
        note: null,
        date: '2026-06-01',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-09-09T00:00:00.000Z',
      },
    ]);

    await pullChanges();

    const row = get<{ amount: number; updated_at: string; sync_status: string }>(
      `SELECT amount, updated_at, sync_status FROM income WHERE uuid = 'inc-local'`,
    );
    expect(row).toEqual({ amount: 999, updated_at: '2026-09-09T00:00:00.000Z', sync_status: 'synced' });
  });

  it('leaves an edit saved during a push pending instead of marking it synced', async () => {
    run(`UPDATE income SET amount = 200 WHERE uuid = 'inc-local'`);
    // Back-date the first edit so the second gets a different millisecond stamp.
    run(`UPDATE income SET updated_at = '2026-06-05T00:00:00.000Z' WHERE uuid = 'inc-local'`);
    editBefore(/UPDATE income SET sync_status = 'synced'/, () =>
      run(`UPDATE income SET amount = 300 WHERE uuid = 'inc-local'`),
    );

    await pushChanges();

    const row = get<{ sync_status: string }>(`SELECT sync_status FROM income WHERE uuid = 'inc-local'`);
    expect(row.sync_status).toBe('pending');
    mockState.onExecute = null;
    await pushChanges();
    expect(cloud.__getTable('income')[0].amount).toBe(300);
  });
});
