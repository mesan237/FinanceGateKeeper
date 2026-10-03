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

function insertExpense(): void {
  sqlite
    .prepare(
      `INSERT INTO expenses (amount, category_id, date, is_recurring, created_at)
       VALUES (1000, 1, '2026-10-01', 0, '2026-10-01T00:00:00Z')`,
    )
    .run();
}

describe('migration 032 — the imprévu flag on expenses', () => {
  it('defaults an expense to planned when the flag is not given', () => {
    insertExpense();
    const row = sqlite.prepare('SELECT is_unplanned FROM expenses').get() as {
      is_unplanned: number;
    };
    expect(row.is_unplanned).toBe(0);
  });

  it('marks an expense pending when only its imprévu flag changes', () => {
    insertExpense();
    // Settle the row as synced, as after a push.
    sqlite
      .prepare(`UPDATE expenses SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
      .run();

    sqlite.prepare('UPDATE expenses SET is_unplanned = 1').run();

    const row = sqlite.prepare('SELECT updated_at, sync_status FROM expenses').get() as {
      updated_at: string;
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
    expect(row.updated_at).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('still marks an expense pending when its account changes', () => {
    insertExpense();
    sqlite
      .prepare(`UPDATE expenses SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
      .run();

    sqlite.prepare('UPDATE expenses SET account_id = 1').run();

    const row = sqlite.prepare('SELECT sync_status FROM expenses').get() as {
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
  });
});
