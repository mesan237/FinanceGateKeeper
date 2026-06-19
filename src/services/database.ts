import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { migrations as registeredMigrations } from '@/services/migrations';

export type SqlBindValue = SQLiteBindValue;

export interface SqliteDriver {
  execute(sql: string, params?: ReadonlyArray<SqlBindValue>): Promise<void>;
  query<T>(sql: string, params?: ReadonlyArray<SqlBindValue>): Promise<T[]>;
}

export interface Migration {
  id: number;
  name: string;
  up(db: SqliteDriver): Promise<void>;
}

const DATABASE_FILENAME = 'finance.db';

let connection: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

function expoDriverFor(db: SQLiteDatabase): SqliteDriver {
  return {
    async execute(sql: string, params: ReadonlyArray<SqlBindValue> = []) {
      await db.runAsync(sql, [...params]);
    },
    async query<T>(sql: string, params: ReadonlyArray<SqlBindValue> = []) {
      return db.getAllAsync<T>(sql, [...params]);
    },
  };
}

async function openAndMigrate(): Promise<SQLiteDatabase> {
  const { openDatabaseAsync } = await import('expo-sqlite');
  const db = await openDatabaseAsync(DATABASE_FILENAME);
  await runMigrations(expoDriverFor(db), registeredMigrations);
  connection = db;
  return db;
}

/**
 * Returns the singleton expo-sqlite database, opening it on first call and
 * running any pending migrations exactly once per process.
 *
 * The open-and-migrate work is memoized as a single in-flight promise so that
 * concurrent callers at startup (every tab screen plus the root providers mount
 * and query at once) share one connection and one migration pass. Without this,
 * each caller would race to call `openDatabaseAsync` and run migrations in
 * parallel against the same file, which crashes expo-sqlite on Android with a
 * `NativeDatabase.prepareAsync` NullPointerException. If initialization fails,
 * the memoized promise is cleared so a later call (e.g. the Retry button) can
 * try again from scratch.
 */
export async function getDb(): Promise<SQLiteDatabase> {
  if (!initPromise) {
    initPromise = openAndMigrate().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

/**
 * Closes the singleton connection and releases the underlying file lock.
 * Subsequent calls to getDb() will reopen the database and re-run the
 * open-and-migrate pass.
 */
export async function closeDb(): Promise<void> {
  if (connection) {
    await connection.closeAsync();
    connection = null;
    initPromise = null;
  }
}

/**
 * Runs a write SQL statement against the singleton expo-sqlite database.
 */
export async function execute(
  sql: string,
  params: ReadonlyArray<SqlBindValue> = [],
): Promise<void> {
  const db = await getDb();
  await expoDriverFor(db).execute(sql, params);
}

/**
 * Runs a read SQL statement against the singleton expo-sqlite database and
 * returns the typed rows.
 */
export async function query<T>(
  sql: string,
  params: ReadonlyArray<SqlBindValue> = [],
): Promise<T[]> {
  const db = await getDb();
  return expoDriverFor(db).query<T>(sql, params);
}

/**
 * Applies every migration in `migrations` that has not yet been recorded in
 * the `_migrations` table. Migrations run in registry order and are tracked
 * by numeric id. Calling this twice is a no-op for already-applied migrations.
 */
export async function runMigrations(
  driver: SqliteDriver,
  migrations: ReadonlyArray<Migration>,
): Promise<void> {
  await driver.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );

  const appliedRows = await driver.query<{ id: number }>('SELECT id FROM _migrations');
  const applied = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    await migration.up(driver);
    await driver.execute(
      'INSERT OR IGNORE INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)',
      [migration.id, migration.name, new Date().toISOString()],
    );
  }
}

/**
 * Drops every user table (then re-runs migrations) on the given driver, wiping
 * all local data back to a fresh-install state — default categories and seeded
 * accounts are restored, and the single `users` row regenerates with no PIN.
 * Split from `resetLocalData` so it can be exercised against an in-memory
 * better-sqlite3 instance in tests. Foreign keys are disabled during the drop so
 * table order doesn't matter; `sqlite_*` and Android's `android_metadata` system
 * tables are left untouched.
 */
export async function resetDataWithDriver(driver: SqliteDriver): Promise<void> {
  await driver.execute('PRAGMA foreign_keys = OFF');
  const tables = await driver.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'android_metadata'",
  );
  for (const { name } of tables) {
    await driver.execute(`DROP TABLE IF EXISTS "${name}"`);
  }
  await driver.execute('PRAGMA foreign_keys = ON');
  await runMigrations(driver, registeredMigrations);
}

/**
 * Wipes all local data on the singleton database. Used by the "Forgot PIN?"
 * recovery flow as the last resort for users with no cloud backup to verify
 * against: erasing the protected data is the only safe way to clear the lock
 * without an identity check. Irreversible.
 */
export async function resetLocalData(): Promise<void> {
  const db = await getDb();
  await resetDataWithDriver(expoDriverFor(db));
}

/**
 * Wraps a better-sqlite3 instance behind the `SqliteDriver` interface so the
 * migration runner can be tested in a Node environment without expo-sqlite.
 */
export function createBetterSqliteDriver(db: {
  prepare(sql: string): {
    run(...params: SqlBindValue[]): unknown;
    all(...params: SqlBindValue[]): unknown[];
  };
  exec(sql: string): unknown;
}): SqliteDriver {
  return {
    async execute(sql: string, params: ReadonlyArray<SqlBindValue> = []) {
      if (params.length === 0) {
        db.exec(sql);
        return;
      }
      db.prepare(sql).run(...params);
    },
    async query<T>(sql: string, params: ReadonlyArray<SqlBindValue> = []) {
      return db.prepare(sql).all(...params) as T[];
    },
  };
}
