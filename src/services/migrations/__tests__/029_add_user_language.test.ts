import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;
let driver: SqliteDriver;

beforeEach(() => {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
});

afterEach(() => {
  sqlite.close();
});

describe('migration 029 — users.language', () => {
  it('leaves an existing users row following the device language (NULL)', async () => {
    await runMigrations(
      driver,
      migrations.filter((m) => m.id < 29),
    );
    sqlite.prepare('INSERT INTO users (created_at) VALUES (?)').run('2026-01-01T00:00:00.000Z');

    await runMigrations(driver, migrations);

    const row = sqlite.prepare('SELECT language FROM users').get() as { language: string | null };
    expect(row.language).toBeNull();
  });

  it('rejects a language the app has no translation for', async () => {
    await runMigrations(driver, migrations);
    sqlite.prepare('INSERT INTO users (created_at) VALUES (?)').run('2026-07-01T00:00:00.000Z');

    expect(() => sqlite.prepare("UPDATE users SET language = 'de'").run()).toThrow();
  });
});
