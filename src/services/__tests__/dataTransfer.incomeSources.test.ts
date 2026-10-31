import Database from 'better-sqlite3';

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

import { exportData, importData } from '@/services/dataTransfer.service';
import type { ExportPayload } from '@/services/dataTransfer.types';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

function legacyIncome(id: number, source: string): Record<string, unknown> {
  return {
    id,
    amount: 1000 * id,
    source,
    note: null,
    date: '2026-09-01',
    created_at: '2026-09-01T00:00:00.000Z',
    uuid: `inc-${id}`,
    updated_at: '2026-09-01T00:00:00.000Z',
    sync_status: 'synced',
    account_id: null,
    allocation_status: 'allocated',
  };
}

describe('importing backups across VS-91 (income sources)', () => {
  it('reads a backup made before income sources: tags become source ids, built-ins come back', async () => {
    const payload = {
      version: 1,
      exportedAt: '2026-10-01T00:00:00.000Z',
      tables: { income: [legacyIncome(1, 'salary'), legacyIncome(2, 'ecommerce'), legacyIncome(3, 'freelance')] },
    } as unknown as ExportPayload;

    await importData(payload);

    const income = sqlite.prepare('SELECT id, source_id FROM income ORDER BY id').all();
    expect(income).toEqual([
      { id: 1, source_id: 1 },
      { id: 2, source_id: 6 },
      { id: 3, source_id: 2 },
    ]);
    const keys = sqlite.prepare('SELECT key FROM income_sources WHERE key IS NOT NULL').all();
    expect(keys).toHaveLength(6);
  });

  it('round-trips a backup with the user’s own sources and hidden built-ins', async () => {
    sqlite.prepare("INSERT INTO income_sources (name, parent_id, created_at) VALUES ('Taxi', 3, '2026-10-01')").run();
    sqlite.prepare('UPDATE income_sources SET is_hidden = 1 WHERE id = 2').run();
    sqlite
      .prepare("INSERT INTO income (amount, source_id, date, created_at) VALUES (900, 7, '2026-10-02', '2026-10-02')")
      .run();
    const payload = await exportData();
    sqlite.prepare('DELETE FROM income').run();
    sqlite.prepare('DELETE FROM income_sources WHERE id = 7').run();

    await importData(payload);

    expect(sqlite.prepare('SELECT name, parent_id FROM income_sources WHERE id = 7').get()).toEqual({
      name: 'Taxi',
      parent_id: 3,
    });
    expect(sqlite.prepare('SELECT is_hidden FROM income_sources WHERE id = 2').get()).toEqual({ is_hidden: 1 });
    expect(sqlite.prepare('SELECT source_id FROM income').get()).toEqual({ source_id: 7 });
  });
});
