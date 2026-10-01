import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;
let driver: SqliteDriver;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(driver, migrations);
});

afterEach(() => {
  sqlite.close();
});

function tableNames(): string[] {
  return (
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
      name: string;
    }[]
  ).map((r) => r.name);
}

function insertList(): void {
  sqlite.prepare("INSERT INTO planned_lists (name, created_at) VALUES ('Market', 'now')").run();
}

describe('migration 030 — planned purchases', () => {
  it('creates the planned_lists and planned_items tables', () => {
    expect(tableNames()).toEqual(expect.arrayContaining(['planned_lists', 'planned_items']));
  });

  it('is idempotent when run a second time', async () => {
    await expect(runMigrations(driver, migrations)).resolves.not.toThrow();
  });

  it('removes the items of a list when the list is deleted', () => {
    insertList();
    sqlite
      .prepare(
        `INSERT INTO planned_items (list_id, name, estimated_amount, category_id, created_at)
         VALUES (1, 'Rice', 5000, 1, 'now')`,
      )
      .run();

    sqlite.prepare('DELETE FROM planned_lists WHERE id = 1').run();

    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM planned_items').get()).toEqual({ n: 0 });
  });

  it('lets an expense be deleted and clears the link from the item', () => {
    insertList();
    sqlite
      .prepare(
        `INSERT INTO expenses (amount, category_id, date, created_at)
         VALUES (4800, 1, '2026-09-30', 'now')`,
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO planned_items
           (list_id, name, estimated_amount, category_id, expense_id, created_at)
         VALUES (1, 'Rice', 5000, 1, 1, 'now')`,
      )
      .run();

    sqlite.prepare('DELETE FROM expenses WHERE id = 1').run();

    expect(sqlite.prepare('SELECT expense_id FROM planned_items').get()).toEqual({
      expense_id: null,
    });
  });

  it('rejects a non-positive estimate', () => {
    insertList();

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO planned_items (list_id, name, estimated_amount, category_id, created_at)
           VALUES (1, 'Rice', 0, 1, 'now')`,
        )
        .run(),
    ).toThrow();
  });
});
