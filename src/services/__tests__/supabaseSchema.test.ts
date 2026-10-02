import { readFileSync } from 'fs';
import { join } from 'path';

import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

// The cloud schema is applied by hand, so nothing else notices when a local
// migration adds a synced column the cloud lacks — until a push fails with
// "Could not find the '<col>' column of '<table>' in the schema cache".

const SUPABASE_DIR = join(__dirname, '..', '..', '..', 'supabase');

/** Columns of each `create table` block in a SQL file, keyed by table name. */
function cloudColumns(sql: string): Map<string, Set<string>> {
  const tables = new Map<string, Set<string>>();
  const blocks = sql.matchAll(/create table (?:if not exists )?(\w+) \(([\s\S]*?)\n\);/g);
  for (const [, table, body] of blocks) {
    const cols = body
      .split('\n')
      .map((line) => line.trim().match(/^(\w+)\s/)?.[1])
      .filter((c): c is string => c !== undefined);
    tables.set(table, new Set(cols));
  }
  return tables;
}

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

describe.each(['schema.sql', 'patches/037_catch_up_schema.sql'])('supabase/%s', (file) => {
  const cloud = cloudColumns(readFileSync(join(SUPABASE_DIR, file), 'utf8'));

  it.each([...SYNCED_TABLES])('has a %s table carrying every column the client pushes', async (table) => {
    const info = await driver.query<{ name: string }>(`PRAGMA table_info(${table})`);
    // `toCloudRow` strips `id` and `sync_status`; everything else is sent.
    const pushed = info.map((c) => c.name).filter((c) => c !== 'id' && c !== 'sync_status');

    const cols = cloud.get(table);
    expect(cols).toBeDefined();
    expect(pushed.filter((c) => !cols?.has(c))).toEqual([]);
  });
});
