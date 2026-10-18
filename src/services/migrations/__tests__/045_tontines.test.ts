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

const TONTINE = `INSERT INTO tontines
  (name, contribution_amount, frequency, start_date, members, payout_turn, account_id, created_at)
  VALUES (?, ?, ?, '2026-10-05', ?, ?, 1, '2026-10-18T08:00:00Z')`;

const PAYMENT = `INSERT INTO tontine_payments (tontine_id, kind, cycle, amount, account_id, date, created_at)
  VALUES (1, ?, ?, ?, 1, '2026-10-05', '2026-10-18T08:00:00Z')`;

describe('migration 045 — tontines', () => {
  it('stores a tontine and its payments with cloud keys, marked pending', () => {
    sqlite.prepare(TONTINE).run('Njangi', 10000, 'weekly', 10, 4);
    sqlite.prepare(PAYMENT).run('contribution', 1, 10000);

    for (const table of ['tontines', 'tontine_payments']) {
      const row = sqlite.prepare(`SELECT uuid, sync_status, deleted_at FROM ${table}`).get() as {
        uuid: string | null;
        sync_status: string;
        deleted_at: string | null;
      };
      expect(row.uuid).not.toBeNull();
      expect(row.sync_status).toBe('pending');
      expect(row.deleted_at).toBeNull();
    }
  });

  it('leaves the payout turn open for a draw', () => {
    sqlite.prepare(TONTINE).run('Njangi', 10000, 'monthly', 10, null);

    const row = sqlite.prepare('SELECT payout_turn FROM tontines').get() as { payout_turn: number | null };
    expect(row.payout_turn).toBeNull();
  });

  it('rejects a bad frequency, too few members and a turn beyond the members', () => {
    expect(() => sqlite.prepare(TONTINE).run('X', 10000, 'daily', 10, null)).toThrow();
    expect(() => sqlite.prepare(TONTINE).run('X', 10000, 'weekly', 1, null)).toThrow();
    expect(() => sqlite.prepare(TONTINE).run('X', 10000, 'weekly', 10, 11)).toThrow();
    expect(() => sqlite.prepare(TONTINE).run('X', 0, 'weekly', 10, null)).toThrow();
  });

  it('rejects an unknown payment kind and a non-positive amount', () => {
    sqlite.prepare(TONTINE).run('Njangi', 10000, 'weekly', 10, 4);

    expect(() => sqlite.prepare(PAYMENT).run('fine', 1, 500)).toThrow();
    expect(() => sqlite.prepare(PAYMENT).run('contribution', 1, 0)).toThrow();
  });

  it('marks a payment pending again when it is soft-deleted', () => {
    sqlite.prepare(TONTINE).run('Njangi', 10000, 'weekly', 10, 4);
    sqlite.prepare(PAYMENT).run('contribution', 1, 10000);
    sqlite.prepare("UPDATE tontine_payments SET sync_status = 'synced'").run();

    sqlite.prepare("UPDATE tontine_payments SET deleted_at = '2026-10-19T08:00:00Z'").run();

    const row = sqlite.prepare('SELECT sync_status FROM tontine_payments').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });
});
