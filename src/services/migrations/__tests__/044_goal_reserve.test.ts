import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;
let driver: SqliteDriver;

const BEFORE = migrations.filter((m) => m.id < 44);

beforeEach(async () => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
  await runMigrations(driver, BEFORE);
});

afterEach(() => {
  sqlite.close();
});

type Row = { uuid: string; sync_status: string; name: string; target_months: number | null };

describe('migration 044 — emergency reserve goals', () => {
  it('keeps every existing goal, its cloud key and its sync state', async () => {
    sqlite
      .prepare(
        `INSERT INTO goals (name, kind, target_amount, target_date, account_id, monthly_amount, created_at)
         VALUES ('School fees', 'sinking', 300000, '2027-09-01', 1, 25000, '2026-10-17T08:00:00Z')`,
      )
      .run();
    sqlite.prepare("UPDATE goals SET sync_status = 'synced'").run();
    const before = sqlite.prepare('SELECT uuid FROM goals').get() as { uuid: string };

    await runMigrations(driver, migrations);

    const row = sqlite.prepare('SELECT uuid, sync_status, name, target_months FROM goals').get() as Row;
    expect(row).toEqual({ uuid: before.uuid, sync_status: 'synced', name: 'School fees', target_months: null });
  });

  it('accepts a reserve sized in months, stamped for sync', async () => {
    await runMigrations(driver, migrations);

    sqlite
      .prepare(
        `INSERT INTO goals (name, kind, target_amount, account_id, monthly_amount, target_months, created_at)
         VALUES ('Reserve', 'reserve', 360000, 1, 20000, 3, '2026-10-18T08:00:00Z')`,
      )
      .run();

    const row = sqlite.prepare('SELECT uuid, sync_status, target_months FROM goals').get() as Row;
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
    expect(row.target_months).toBe(3);
  });

  it('still rejects an unknown kind and an out-of-range number of months', async () => {
    await runMigrations(driver, migrations);
    const insert = sqlite.prepare(
      `INSERT INTO goals (name, kind, target_amount, account_id, monthly_amount, target_months, created_at)
       VALUES ('X', ?, 1000, 1, 0, ?, '2026-10-18T08:00:00Z')`,
    );

    expect(() => insert.run('retirement', null)).toThrow();
    expect(() => insert.run('reserve', 0)).toThrow();
    expect(() => insert.run('reserve', 13)).toThrow();
  });

  it('marks a goal pending again when its months change', async () => {
    await runMigrations(driver, migrations);
    sqlite
      .prepare(
        `INSERT INTO goals (name, kind, target_amount, account_id, monthly_amount, target_months, created_at)
         VALUES ('Reserve', 'reserve', 360000, 1, 20000, 3, '2026-10-18T08:00:00Z')`,
      )
      .run();
    sqlite.prepare("UPDATE goals SET sync_status = 'synced'").run();

    sqlite.prepare('UPDATE goals SET target_months = 6').run();

    const row = sqlite.prepare('SELECT sync_status FROM goals').get() as Row;
    expect(row.sync_status).toBe('pending');
  });
});
