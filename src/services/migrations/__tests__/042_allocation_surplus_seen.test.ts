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

describe('migration 042 — allocation surplus seen', () => {
  it('adds a nullable surplus_seen column to allocations', () => {
    sqlite
      .prepare(
        `INSERT INTO allocations
           (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
            priority_order, is_locked, created_at)
         VALUES ('2026-10', 0, 0, 0, 100, '[]', 0, '2026-10-01T00:00:00Z')`,
      )
      .run();

    const row = sqlite.prepare('SELECT surplus_seen FROM allocations').get() as {
      surplus_seen: number | null;
    };
    expect(row.surplus_seen).toBeNull();
  });

  it('marks the month for sync when the surplus is acknowledged', () => {
    sqlite
      .prepare(
        `INSERT INTO allocations
           (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
            priority_order, is_locked, created_at)
         VALUES ('2026-10', 0, 0, 0, 100, '[]', 0, '2026-10-01T00:00:00Z')`,
      )
      .run();
    sqlite.prepare("UPDATE allocations SET sync_status = 'synced'").run();

    sqlite.prepare("UPDATE allocations SET surplus_seen = 40000 WHERE month = '2026-10'").run();

    const row = sqlite.prepare('SELECT sync_status FROM allocations').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });
});
