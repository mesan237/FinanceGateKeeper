import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

let sqlite: Database.Database;
let driver: SqliteDriver;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
  await runMigrations(driver, migrations);
});

afterEach(() => {
  sqlite.close();
});

type Row = { uuid: string | null; sync_status: string };

function insertEvent(name = 'Marie’s wedding'): number {
  return sqlite
    .prepare("INSERT INTO events (name, date, created_at) VALUES (?, '2026-11-07', '2026-10-22T08:00:00Z')")
    .run(name).lastInsertRowid as number;
}

function insertExpense(eventId: number | null): number {
  return sqlite
    .prepare(
      `INSERT INTO expenses (amount, category_id, subcategory_id, note, date, is_recurring, event_id, created_at)
       VALUES (5000, 5, NULL, NULL, '2026-11-07', 0, ?, '2026-11-07T08:00:00Z')`,
    )
    .run(eventId).lastInsertRowid as number;
}

describe('migration 049 — events (VS-61)', () => {
  it('stores an event, stamped for sync', () => {
    insertEvent();

    const row = sqlite.prepare('SELECT uuid, sync_status FROM events').get() as Row;
    expect(row.uuid).not.toBeNull();
    expect(row.sync_status).toBe('pending');
  });

  it('links an expense to an event, and leaves it unlinked by default', () => {
    const event = insertEvent();
    insertExpense(event);
    insertExpense(null);

    const rows = sqlite.prepare('SELECT event_id FROM expenses ORDER BY id').all() as { event_id: number | null }[];
    expect(rows.map((r) => r.event_id)).toEqual([event, null]);
  });

  it('marks an expense pending again when its event changes', () => {
    const event = insertEvent();
    const expense = insertExpense(null);
    sqlite.prepare("UPDATE expenses SET sync_status = 'synced'").run();

    sqlite.prepare('UPDATE expenses SET event_id = ? WHERE id = ?').run(event, expense);

    expect((sqlite.prepare('SELECT sync_status FROM expenses').get() as Row).sync_status).toBe('pending');
  });

  it('keeps marking an expense pending for the columns it watched before', () => {
    insertExpense(null);
    sqlite.prepare("UPDATE expenses SET sync_status = 'synced'").run();

    sqlite.prepare('UPDATE expenses SET is_unplanned = 1').run();

    expect((sqlite.prepare('SELECT sync_status FROM expenses').get() as Row).sync_status).toBe('pending');
  });

  it('syncs events before expenses, so a restored expense finds its event', () => {
    expect(SYNCED_TABLES.indexOf('events')).toBeGreaterThanOrEqual(0);
    expect(SYNCED_TABLES.indexOf('events')).toBeLessThan(SYNCED_TABLES.indexOf('expenses'));
  });
});
