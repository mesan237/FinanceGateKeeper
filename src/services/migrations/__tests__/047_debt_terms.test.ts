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
  sqlite
    .prepare(
      `INSERT INTO debts (person_name, amount, direction, date, status, created_at)
       VALUES ('Awa', 100000, 'owed', '2026-10-01', 'pending', '2026-10-01T08:00:00Z')`,
    )
    .run();
  sqlite.prepare("UPDATE debts SET sync_status = 'synced'").run();
});

afterEach(() => {
  sqlite.close();
});

describe('migration 047 — debt terms', () => {
  it('leaves existing debts without terms', () => {
    const row = sqlite
      .prepare('SELECT total_to_repay, instalment_count, instalment_frequency, first_instalment_date FROM debts')
      .get();
    expect(row).toEqual({
      total_to_repay: null,
      instalment_count: null,
      instalment_frequency: null,
      first_instalment_date: null,
    });
  });

  it('marks a debt for sync when its terms change', () => {
    sqlite.prepare("UPDATE debts SET total_to_repay = 120000, instalment_count = 6, instalment_frequency = 'monthly'").run();

    const row = sqlite.prepare('SELECT sync_status FROM debts').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });

  it('records which instalment a repayment pays, and marks it for sync', () => {
    sqlite
      .prepare(
        `INSERT INTO debt_payments (debt_id, amount, date, created_at, instalment)
         VALUES (1, 20000, '2026-11-01', '2026-11-01T08:00:00Z', 1)`,
      )
      .run();
    sqlite.prepare("UPDATE debt_payments SET sync_status = 'synced'").run();

    sqlite.prepare('UPDATE debt_payments SET instalment = 2').run();

    const row = sqlite.prepare('SELECT instalment, sync_status FROM debt_payments').get() as {
      instalment: number;
      sync_status: string;
    };
    expect(row).toEqual({ instalment: 2, sync_status: 'pending' });
  });
});
