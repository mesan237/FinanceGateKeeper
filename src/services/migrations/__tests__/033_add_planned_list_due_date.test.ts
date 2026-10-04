import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  const driver: SqliteDriver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(driver, migrations);
});

afterEach(() => {
  sqlite.close();
});

function insertList(): void {
  sqlite
    .prepare(`INSERT INTO planned_lists (name, created_at) VALUES ('Market', '2026-10-01T00:00:00Z')`)
    .run();
}

function settleAsSynced(): void {
  sqlite
    .prepare(
      `UPDATE planned_lists SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`,
    )
    .run();
}

describe('migration 033 — a due date on planned lists', () => {
  it('leaves lists created before it without a due date', () => {
    insertList();
    const row = sqlite.prepare('SELECT due_date FROM planned_lists').get() as {
      due_date: string | null;
    };
    expect(row.due_date).toBeNull();
  });

  it('marks a list pending when only its due date changes', () => {
    insertList();
    settleAsSynced();

    sqlite.prepare(`UPDATE planned_lists SET due_date = '2026-10-10'`).run();

    const row = sqlite.prepare('SELECT updated_at, sync_status FROM planned_lists').get() as {
      updated_at: string;
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
    expect(row.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('still marks a list pending when it is renamed', () => {
    insertList();
    settleAsSynced();

    sqlite.prepare(`UPDATE planned_lists SET name = 'Groceries'`).run();

    const row = sqlite.prepare('SELECT sync_status FROM planned_lists').get() as {
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
  });
});
