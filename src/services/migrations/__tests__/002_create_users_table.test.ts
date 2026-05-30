import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations } from '@/services/database';
import { migrations } from '@/services/migrations';

function freshDriver() {
  const sqlite = new Database(':memory:');
  return { sqlite, driver: createBetterSqliteDriver(sqlite) };
}

describe('migration 002_create_users_table', () => {
  it('creates a users table with the expected columns', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const cols = await driver.query<{ name: string; notnull: number; dflt_value: string | null }>(
      "PRAGMA table_info('users')",
    );
    const names = cols.map((c) => c.name).sort();
    expect(names).toEqual(['app_mode', 'created_at', 'id', 'pin_hash', 'pin_salt']);

    const appMode = cols.find((c) => c.name === 'app_mode');
    expect(appMode?.dflt_value).toBe("'learning'");
    sqlite.close();
  });

  it('refuses to insert a row with id != 1', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    await expect(
      driver.execute(
        "INSERT INTO users (id, pin_hash, pin_salt, created_at) VALUES (2, 'h', 's', '2026-01-01')",
      ),
    ).rejects.toThrow();
    sqlite.close();
  });

  it('records the migration in the _migrations table', async () => {
    const { sqlite, driver } = freshDriver();
    await runMigrations(driver, migrations);

    const rows = await driver.query<{ id: number; name: string }>(
      'SELECT id, name FROM _migrations WHERE id = 2',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('002_create_users_table');
    sqlite.close();
  });
});
