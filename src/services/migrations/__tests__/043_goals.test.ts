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

const INSERT = `INSERT INTO goals (name, kind, target_amount, target_date, account_id, monthly_amount, created_at)
  VALUES (?, ?, ?, ?, 1, ?, '2026-10-17T08:00:00Z')`;

describe('migration 043 — goals', () => {
  it('stores a wallet-linked goal with a cloud key and marks it pending', () => {
    sqlite.prepare(INSERT).run('School fees', 'sinking', 300000, '2027-09-01', 25000);

    const row = sqlite.prepare('SELECT uuid, sync_status, deleted_at FROM goals').get() as {
      uuid: string | null;
      sync_status: string;
      deleted_at: string | null;
    };
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
    expect(row.deleted_at).toBeNull();
  });

  it('rejects an unknown kind and a non-positive target', () => {
    expect(() => sqlite.prepare(INSERT).run('X', 'retirement', 1000, null, 0)).toThrow();
    expect(() => sqlite.prepare(INSERT).run('X', 'buffer', 0, null, 0)).toThrow();
  });

  it('marks a goal pending again when it is soft-deleted', () => {
    sqlite.prepare(INSERT).run('Buffer', 'buffer', 100000, null, 10000);
    sqlite.prepare("UPDATE goals SET sync_status = 'synced'").run();

    sqlite.prepare("UPDATE goals SET deleted_at = '2026-10-18T08:00:00Z'").run();

    const row = sqlite.prepare('SELECT sync_status FROM goals').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });
});
