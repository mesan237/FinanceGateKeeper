import Database from 'better-sqlite3';

import {
  createBetterSqliteDriver,
  runMigrations,
  type Migration,
} from '@/services/database';

function freshDriver() {
  const sqlite = new Database(':memory:');
  return {
    sqlite,
    driver: createBetterSqliteDriver(
      sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
    ),
  };
}

const migration001: Migration = {
  id: 1,
  name: '001_create_migrations_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )`,
    );
  },
};

const migration002: Migration = {
  id: 2,
  name: '002_dummy',
  async up(db) {
    await db.execute(`CREATE TABLE dummy (id INTEGER PRIMARY KEY)`);
  },
};

describe('runMigrations', () => {
  it('applies pending migrations in numeric order', async () => {
    const { sqlite, driver } = freshDriver();
    const order: number[] = [];
    const tracked: Migration[] = [
      {
        id: 1,
        name: '001_create_migrations_table',
        async up(db) {
          order.push(1);
          await migration001.up(db);
        },
      },
      {
        id: 2,
        name: '002_dummy',
        async up(db) {
          order.push(2);
          await migration002.up(db);
        },
      },
    ];

    await runMigrations(driver, tracked);

    expect(order).toEqual([1, 2]);
    sqlite.close();
  });

  it('records applied migrations in the _migrations table', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, [migration001, migration002]);

    const rows = await driver.query<{ id: number; name: string; applied_at: string }>(
      'SELECT id, name, applied_at FROM _migrations ORDER BY id',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('001_create_migrations_table');
    expect(rows[1].name).toBe('002_dummy');
    expect(typeof rows[0].applied_at).toBe('string');
    sqlite.close();
  });

  it('does not re-run a migration on a second invocation', async () => {
    const { sqlite, driver } = freshDriver();
    let runs = 0;
    const counted: Migration = {
      id: 1,
      name: '001_create_migrations_table',
      async up(db) {
        runs += 1;
        await migration001.up(db);
      },
    };

    await runMigrations(driver, [counted]);
    await runMigrations(driver, [counted]);

    expect(runs).toBe(1);
    sqlite.close();
  });

  it('opens a fresh database cleanly with no pre-existing tables', async () => {
    const { sqlite, driver } = freshDriver();
    const rows = await driver.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table'",
    );
    expect(rows).toEqual([]);
    sqlite.close();
  });

  it('releases the lock on close so a subsequent open succeeds', async () => {
    const first = freshDriver();
    await runMigrations(first.driver, [migration001]);
    first.sqlite.close();

    const second = freshDriver();
    await expect(runMigrations(second.driver, [migration001])).resolves.toBeUndefined();
    second.sqlite.close();
  });
});
