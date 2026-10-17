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

describe('migration 041 — baseline facts', () => {
  it('stores a fact with its source, a cloud key, and marks it pending', () => {
    sqlite
      .prepare(
        `INSERT INTO baseline_facts (kind, value, created_at)
         VALUES ('monthly_income', 250000, '2026-10-17T08:00:00Z')`,
      )
      .run();

    const row = sqlite.prepare('SELECT source, uuid, sync_status FROM baseline_facts').get() as {
      source: string;
      uuid: string | null;
      sync_status: string;
    };
    expect(row.source).toBe('user');
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
  });
});
