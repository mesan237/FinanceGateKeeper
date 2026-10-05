import Database from 'better-sqlite3';
import * as fakeSupabase from '@supabase/supabase-js';
import { Directory, Paths } from 'expo-file-system';

import {
  createBetterSqliteDriver,
  resetDataWithDriver,
  runMigrations,
  type SqliteDriver,
} from '@/services/database';
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

import { listSnapshots } from '@/services/snapshots.service';
import { pushChanges, syncNow } from '@/services/sync';

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
function count(sql: string): number {
  return (sqlite.prepare(sql).get() as { c: number }).c;
}
function insertIncome(amount: number): void {
  run(
    `INSERT INTO income (amount, source, date, created_at) VALUES (?, 'salary', '2026-06-01', '2026-06-01T00:00:00.000Z')`,
    amount,
  );
}

/** Backs the phone up, then wipes it the way the PIN-recovery reset does. */
async function backUpThenWipe(): Promise<void> {
  await pushChanges();
  await resetDataWithDriver(mockState.driver!);
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  cloud.__reset();
  cloud.__setSession({ user: { id: 'u1' } });
  const backups = new Directory(Paths.document, 'backups');
  if (backups.exists) backups.delete();
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('syncNow on a phone that has never synced', () => {
  it('restores the cloud copy instead of pushing fresh default accounts after a reset', async () => {
    insertIncome(5000);
    await backUpThenWipe();

    const result = await syncNow();

    expect(result).toMatchObject({ ok: true, pushed: 0, restoredFromCloud: true });
    expect(count('SELECT COUNT(*) AS c FROM accounts')).toBe(3);
    expect(cloud.__getTable('accounts')).toHaveLength(3);
    expect(count('SELECT COUNT(*) AS c FROM income WHERE amount = 5000')).toBe(1);
  });

  it('keeps a renamed default category instead of overwriting it with the factory name', async () => {
    const { id } = sqlite
      .prepare('SELECT id FROM categories WHERE is_default = 1 LIMIT 1')
      .get() as { id: number };
    run(`UPDATE categories SET name = 'Groceries & market' WHERE id = ?`, id);
    await backUpThenWipe();

    await syncNow();

    expect(count(`SELECT COUNT(*) AS c FROM categories WHERE name = 'Groceries & market'`)).toBe(1);
    const cloudNames = cloud.__getTable('categories').map((r) => r.name);
    expect(cloudNames).toContain('Groceries & market');
  });

  it('leaves every restored row synced, so nothing is pushed back', async () => {
    insertIncome(5000);
    await backUpThenWipe();

    await syncNow();

    expect(count(`SELECT COUNT(*) AS c FROM accounts WHERE sync_status = 'pending'`)).toBe(0);
    expect((await pushChanges()).pushed).toBe(0);
  });

  it('takes a "before restore" snapshot first', async () => {
    insertIncome(5000);
    await backUpThenWipe();

    await syncNow();

    const [snapshot] = await listSnapshots();
    expect(snapshot.reason).toBe('before-restore');
  });

  it('pushes the defaults normally when the cloud backup is empty', async () => {
    const result = await syncNow();

    expect(result.ok).toBe(true);
    expect(result.restoredFromCloud).toBeFalsy();
    expect(result.pushed).toBeGreaterThan(0);
    expect(cloud.__getTable('accounts')).toHaveLength(3);
  });

  it('merges instead of replacing when the phone already holds records of its own', async () => {
    cloud.__seed('income', [
      {
        uuid: 'cloud-income',
        amount: 5000,
        source: 'salary',
        note: null,
        date: '2026-06-01',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ]);
    insertIncome(7000);

    const result = await syncNow();

    expect(result.restoredFromCloud).toBeFalsy();
    expect(count('SELECT COUNT(*) AS c FROM income')).toBe(2);
    expect(cloud.__getTable('income').map((r) => r.amount)).toContain(7000);
  });

  it('syncs normally once the first restore is done', async () => {
    insertIncome(5000);
    await backUpThenWipe();
    await syncNow();
    insertIncome(9000);

    const result = await syncNow();

    expect(result).toMatchObject({ ok: true, pushed: 1 });
    expect(result.restoredFromCloud).toBeFalsy();
  });
});
