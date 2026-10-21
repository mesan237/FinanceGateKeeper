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

const INSERT = `INSERT INTO month_snapshots
  (month, wallets, lent, owed, tontines, net_worth, income, spending, created_at)
  VALUES ('2026-09', 150000, 20000, 30000, 10000, 150000, 250000, 200000, ?)`;

describe('migration 046 — month snapshots', () => {
  it('stores a month-end snapshot with a cloud key, marked pending', () => {
    sqlite.prepare(INSERT).run('2026-10-01T06:00:00Z');

    const row = sqlite.prepare('SELECT uuid, sync_status, net_worth FROM month_snapshots').get() as {
      uuid: string | null;
      sync_status: string;
      net_worth: number;
    };
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
    expect(row.net_worth).toBe(150000);
  });

  it('keeps every snapshot of a month, so two devices or a recalculation never collide', () => {
    sqlite.prepare(INSERT).run('2026-10-01T06:00:00Z');
    sqlite.prepare(INSERT).run('2026-10-05T06:00:00Z');

    const { n } = sqlite.prepare('SELECT COUNT(*) AS n FROM month_snapshots').get() as { n: number };
    expect(n).toBe(2);
  });
});
