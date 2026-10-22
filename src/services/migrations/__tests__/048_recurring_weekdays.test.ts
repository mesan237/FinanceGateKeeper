import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;
let driver: SqliteDriver;

const BEFORE = migrations.filter((m) => m.id < 48);

beforeEach(async () => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
  await runMigrations(driver, BEFORE);
});

afterEach(() => {
  sqlite.close();
});

type Row = { uuid: string | null; sync_status: string; label: string; account_id: number | null; frequency: string };

const INSERT = `INSERT INTO recurring_expenses
  (label, amount, category_id, subcategory_id, frequency, next_due_date, is_active, account_id, created_at)
  VALUES (?, 1000, 5, NULL, ?, '2026-10-26', 1, 1, '2026-10-22T08:00:00Z')`;

describe('migration 048 — weekday recurring expenses (VS-60)', () => {
  it('keeps every existing recurring expense, its wallet, cloud key and sync state', async () => {
    sqlite.prepare(INSERT).run('Rent', 'monthly');
    sqlite.prepare("UPDATE recurring_expenses SET sync_status = 'synced'").run();
    const before = sqlite.prepare('SELECT uuid FROM recurring_expenses').get() as { uuid: string };

    await runMigrations(driver, migrations);

    const row = sqlite
      .prepare('SELECT uuid, sync_status, label, account_id, frequency FROM recurring_expenses')
      .get() as Row;
    expect(row).toEqual({ uuid: before.uuid, sync_status: 'synced', label: 'Rent', account_id: 1, frequency: 'monthly' });
  });

  it('accepts a weekday frequency, stamped for sync', async () => {
    await runMigrations(driver, migrations);

    sqlite.prepare(INSERT).run('Taxi to work', 'weekdays');

    const row = sqlite.prepare('SELECT uuid, sync_status, frequency FROM recurring_expenses').get() as Row;
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
    expect(row.frequency).toBe('weekdays');
  });

  it('still rejects an unknown frequency', async () => {
    await runMigrations(driver, migrations);

    expect(() => sqlite.prepare(INSERT).run('Bread', 'daily')).toThrow();
  });

  it('marks a recurring expense pending again when its frequency or wallet changes', async () => {
    await runMigrations(driver, migrations);
    sqlite.prepare(INSERT).run('Taxi to work', 'weekly');
    sqlite.prepare("UPDATE recurring_expenses SET sync_status = 'synced'").run();

    sqlite.prepare("UPDATE recurring_expenses SET frequency = 'weekdays'").run();
    expect((sqlite.prepare('SELECT sync_status FROM recurring_expenses').get() as Row).sync_status).toBe('pending');

    sqlite.prepare("UPDATE recurring_expenses SET sync_status = 'synced'").run();
    sqlite.prepare('UPDATE recurring_expenses SET account_id = 2').run();
    expect((sqlite.prepare('SELECT sync_status FROM recurring_expenses').get() as Row).sync_status).toBe('pending');
  });
});
