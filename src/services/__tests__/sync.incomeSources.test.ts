import Database from 'better-sqlite3';
import * as fakeSupabase from '@supabase/supabase-js';
import { Directory, Paths } from 'expo-file-system';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) => mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) => mockState.driver!.query(sql, params as never),
  };
});

import { pushChanges, restoreFromCloud, syncNow } from '@/services/sync';

const cloud = fakeSupabase as unknown as {
  __reset(): void;
  __seed(table: string, rows: Record<string, unknown>[]): void;
  __getTable(table: string): Record<string, unknown>[];
  __setSession(session: unknown): void;
};

let sqlite: Database.Database;

function all<T>(sql: string): T[] {
  return sqlite.prepare(sql).all() as T[];
}

const TAXI = {
  uuid: 'src-taxi',
  key: null,
  name: 'Taxi',
  parent_id: 'seed-income-source-business',
  is_hidden: 0,
  sort_order: 1,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
};

function cloudIncome(uuid: string, sourceUuid: string, amount: number): Record<string, unknown> {
  return {
    uuid,
    amount,
    source_id: sourceUuid,
    note: null,
    date: '2026-10-02',
    created_at: '2026-10-02T00:00:00.000Z',
    updated_at: '2026-10-02T00:00:00.000Z',
  };
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
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

describe('income sources in sync (VS-91)', () => {
  it('pushes a source the user made with its parent’s uuid, and income with its source’s uuid', async () => {
    sqlite.prepare("INSERT INTO income_sources (name, parent_id, created_at) VALUES ('Taxi', 3, '2026-10-01')").run();
    sqlite
      .prepare("INSERT INTO income (amount, source_id, date, created_at) VALUES (900, 7, '2026-10-02', '2026-10-02')")
      .run();

    await pushChanges();

    const [source] = cloud.__getTable('income_sources');
    expect(source).toMatchObject({ name: 'Taxi', key: null, parent_id: 'seed-income-source-business' });
    expect(cloud.__getTable('income')[0].source_id).toBe(source.uuid);
  });

  it('does not push the built-in sources until one changes', async () => {
    await pushChanges();
    expect(cloud.__getTable('income_sources')).toEqual([]);

    sqlite.prepare('UPDATE income_sources SET is_hidden = 1 WHERE id = 2').run();
    await pushChanges();
    expect(cloud.__getTable('income_sources').map((r) => r.uuid)).toEqual(['seed-income-source-freelance']);
  });

  it('restores the user’s sources and links income to them and to the built-ins', async () => {
    cloud.__seed('income_sources', [TAXI]);
    cloud.__seed('income', [cloudIncome('i1', 'src-taxi', 900), cloudIncome('i2', 'seed-income-source-salary', 500)]);

    const result = await restoreFromCloud();

    expect(result.ok).toBe(true);
    const sources = all<{ id: number; key: string | null; name: string; parent_id: number | null }>(
      'SELECT id, key, name, parent_id FROM income_sources ORDER BY id',
    );
    expect(sources.filter((s) => s.key !== null)).toHaveLength(6);
    const taxi = sources.find((s) => s.name === 'Taxi');
    expect(taxi?.parent_id).toBe(3);
    const income = all<{ amount: number; source_id: number }>('SELECT amount, source_id FROM income ORDER BY amount');
    expect(income).toEqual([
      { amount: 500, source_id: 1 },
      { amount: 900, source_id: taxi?.id },
    ]);
  });

  it('keeps a built-in the user hid on another phone hidden after the restore', async () => {
    cloud.__seed('income_sources', [
      {
        uuid: 'seed-income-source-freelance',
        key: 'freelance',
        name: 'Freelance',
        parent_id: null,
        is_hidden: 1,
        sort_order: 1,
        created_at: '2026-10-31T00:00:00.000Z',
        updated_at: '2026-10-05T00:00:00.000Z',
      },
    ]);
    cloud.__seed('income', [cloudIncome('i1', 'seed-income-source-salary', 500)]);

    await restoreFromCloud();

    const [freelance] = all<{ is_hidden: number }>('SELECT is_hidden FROM income_sources WHERE id = 2');
    expect(freelance.is_hidden).toBe(1);
  });

  it('still restores a cloud backup on a fresh phone, whose only sources are the built-ins', async () => {
    cloud.__seed('income', [cloudIncome('i1', 'seed-income-source-salary', 500)]);

    const result = await syncNow();

    expect(result.ok).toBe(true);
    expect(all<{ amount: number }>('SELECT amount FROM income')).toEqual([{ amount: 500 }]);
    expect(cloud.__getTable('income_sources')).toEqual([]);
  });
});
