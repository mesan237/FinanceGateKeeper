import Database from 'better-sqlite3';
import * as fakeSupabase from '@supabase/supabase-js';

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

import { getLastSyncedAt, pullChanges, pushChanges, syncNow } from '@/services/sync';

const cloud = fakeSupabase as unknown as {
  __reset(): void;
  __seed(table: string, rows: Record<string, unknown>[]): void;
  __getTable(table: string): Record<string, unknown>[];
  __setSession(session: unknown): void;
  __fail(err: string | null): void;
};

let sqlite: Database.Database;

function run(sql: string, ...params: unknown[]): void {
  sqlite.prepare(sql).run(...(params as never[]));
}
function get<T>(sql: string, ...params: unknown[]): T {
  return sqlite.prepare(sql).get(...(params as never[])) as T;
}
function all<T>(sql: string, ...params: unknown[]): T[] {
  return sqlite.prepare(sql).all(...(params as never[])) as T[];
}

function insertIncome(amount: number): void {
  run(
    `INSERT INTO income (amount, source, date, created_at) VALUES (?, 'salary', '2026-06-01', '2026-06-01T00:00:00.000Z')`,
    amount,
  );
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  cloud.__reset();
  cloud.__setSession({ user: { id: 'u1' } });
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('pushChanges', () => {
  it('sends pending rows to the cloud and marks them synced', async () => {
    insertIncome(5000);

    await pushChanges();

    const cloudIncome = cloud.__getTable('income');
    expect(cloudIncome).toHaveLength(1);
    expect(cloudIncome[0].amount).toBe(5000);
    expect(cloudIncome[0].uuid).toBeTruthy();

    const localRow = get<{ sync_status: string }>('SELECT sync_status FROM income LIMIT 1');
    expect(localRow.sync_status).toBe('synced');
  });

  it('leaves no pending rows after a successful push', async () => {
    insertIncome(5000);
    await pushChanges();
    const pending = get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM income WHERE sync_status = 'pending'`,
    );
    expect(pending.c).toBe(0);
  });

  it('only sends rows that are pending', async () => {
    insertIncome(100);
    // settle the first row without re-arming the trigger (sync-only columns)
    run(`UPDATE income SET sync_status = 'synced' WHERE amount = 100`);
    insertIncome(200);

    await pushChanges();

    const amounts = cloud.__getTable('income').map((r) => r.amount);
    expect(amounts).toContain(200);
    expect(amounts).not.toContain(100);
  });
});

describe('pullChanges', () => {
  it('inserts a cloud-only row into the local database', async () => {
    cloud.__seed('income', [
      {
        uuid: 'inc-1',
        amount: 7777,
        source: 'freelance',
        note: null,
        date: '2026-06-05',
        created_at: '2026-06-05T00:00:00.000Z',
        updated_at: '2026-06-05T10:00:00.000Z',
      },
    ]);

    await pullChanges();

    const row = get<{ amount: number; sync_status: string }>(
      `SELECT amount, sync_status FROM income WHERE uuid = 'inc-1'`,
    );
    expect(row.amount).toBe(7777);
    expect(row.sync_status).toBe('synced');
  });

  it('overwrites a local row when the cloud row is newer', async () => {
    insertIncome(100);
    run(
      `UPDATE income SET uuid = 'inc-x', updated_at = '2020-01-01T00:00:00.000Z', sync_status = 'synced'`,
    );
    cloud.__seed('income', [
      {
        uuid: 'inc-x',
        amount: 999,
        source: 'salary',
        note: null,
        date: '2026-06-01',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-09-09T00:00:00.000Z',
      },
    ]);

    await pullChanges();

    const row = get<{ amount: number }>(`SELECT amount FROM income WHERE uuid = 'inc-x'`);
    expect(row.amount).toBe(999);
  });

  it('keeps the local row when the cloud row is older or equal (local wins)', async () => {
    insertIncome(100);
    run(
      `UPDATE income SET uuid = 'inc-x', updated_at = '2026-12-31T00:00:00.000Z', sync_status = 'synced'`,
    );
    cloud.__seed('income', [
      {
        uuid: 'inc-x',
        amount: 999,
        source: 'salary',
        note: null,
        date: '2026-06-01',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2020-01-01T00:00:00.000Z',
      },
    ]);

    await pullChanges();

    const row = get<{ amount: number }>(`SELECT amount FROM income WHERE uuid = 'inc-x'`);
    expect(row.amount).toBe(100);
  });

  it('only fetches rows newer than the lastPulledAt cursor', async () => {
    run(`INSERT INTO sync_meta (key, value) VALUES ('lastPulledAt', '2026-06-15T00:00:00.000Z')`);
    cloud.__seed('income', [
      {
        uuid: 'old',
        amount: 1,
        source: 'salary',
        note: null,
        date: '2026-06-01',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
      {
        uuid: 'new',
        amount: 2,
        source: 'salary',
        note: null,
        date: '2026-06-20',
        created_at: '2026-06-20T00:00:00.000Z',
        updated_at: '2026-06-20T00:00:00.000Z',
      },
    ]);

    await pullChanges();

    expect(all(`SELECT 1 FROM income WHERE uuid = 'new'`)).toHaveLength(1);
    expect(all(`SELECT 1 FROM income WHERE uuid = 'old'`)).toHaveLength(0);
  });

  it('round-trips a foreign key through uuid (expense → category)', async () => {
    cloud.__seed('categories', [
      {
        uuid: 'cat-A',
        name: 'Travel',
        parent_id: null,
        is_default: 0,
        sort_order: 99,
        is_hidden: 0,
        updated_at: '2026-06-05T00:00:00.000Z',
      },
    ]);
    cloud.__seed('expenses', [
      {
        uuid: 'exp-A',
        amount: 4200,
        category_id: 'cat-A',
        subcategory_id: null,
        note: null,
        date: '2026-06-05',
        is_recurring: 0,
        created_at: '2026-06-05T00:00:00.000Z',
        updated_at: '2026-06-05T10:00:00.000Z',
      },
    ]);

    await pullChanges();

    const cat = get<{ id: number }>(`SELECT id FROM categories WHERE uuid = 'cat-A'`);
    const exp = get<{ category_id: number }>(`SELECT category_id FROM expenses WHERE uuid = 'exp-A'`);
    expect(exp.category_id).toBe(cat.id);
  });
});

describe('syncNow', () => {
  it('reports not-signed-in and writes nothing when there is no session', async () => {
    cloud.__setSession(null);
    insertIncome(5000);

    const result = await syncNow();

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Not signed in');
    const pending = get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM income WHERE sync_status = 'pending'`,
    );
    expect(pending.c).toBe(1);
  });

  it('returns ok:false (not a throw) on a network error and leaves rows pending', async () => {
    insertIncome(5000);
    cloud.__fail('network down');

    const result = await syncNow();

    expect(result.ok).toBe(false);
    expect(result.error).toBe('network down');
    const pending = get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM income WHERE sync_status = 'pending'`,
    );
    expect(pending.c).toBe(1);
  });

  it('restores all synced tables onto an empty local database', async () => {
    cloud.__seed('income', [
      {
        uuid: 'i1',
        amount: 100,
        source: 'salary',
        note: null,
        date: '2026-06-01',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
      {
        uuid: 'i2',
        amount: 200,
        source: 'freelance',
        note: null,
        date: '2026-06-02',
        created_at: '2026-06-02T00:00:00.000Z',
        updated_at: '2026-06-02T00:00:00.000Z',
      },
    ]);
    cloud.__seed('debts', [
      {
        uuid: 'd1',
        person_name: 'Jean',
        amount: 15000,
        direction: 'lent',
        date: '2026-06-01',
        due_date: null,
        status: 'pending',
        note: null,
        settled_at: null,
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ]);

    const result = await syncNow();

    expect(result.ok).toBe(true);
    expect(get<{ c: number }>('SELECT COUNT(*) AS c FROM income').c).toBe(2);
    expect(get<{ c: number }>('SELECT COUNT(*) AS c FROM debts').c).toBe(1);
    expect(await getLastSyncedAt()).toBeTruthy();
  });
});
