import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

let sqlite: Database.Database;
let driver: SqliteDriver;

function open() {
  sqlite = new Database(':memory:');
  driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
}

afterEach(() => {
  sqlite.close();
});

function columns(table: string): string[] {
  return (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (r) => r.name,
  );
}

describe('migration 025 — onboarding_complete', () => {
  it('adds the column to the users table', async () => {
    open();
    await runMigrations(driver, migrations);
    expect(columns('users')).toContain('onboarding_complete');
  });

  it('defaults a brand-new users row to 0 (carousel shown)', async () => {
    open();
    await runMigrations(driver, migrations);
    // A fresh install seeds its users row after migrations run.
    sqlite.prepare('INSERT INTO users (created_at) VALUES (?)').run('2026-07-01T00:00:00.000Z');
    const row = sqlite.prepare('SELECT onboarding_complete FROM users').get() as {
      onboarding_complete: number;
    };
    expect(row.onboarding_complete).toBe(0);
  });

  it('backfills an existing users row to 1 on upgrade (carousel skipped)', async () => {
    open();
    // Simulate an existing install: run everything up to (not including) 025, so
    // the users row already exists when 025 runs.
    await runMigrations(
      driver,
      migrations.filter((m) => m.id < 25),
    );
    sqlite.prepare('INSERT INTO users (created_at) VALUES (?)').run('2026-01-01T00:00:00.000Z');

    await runMigrations(
      driver,
      migrations.filter((m) => m.id === 25),
    );

    const row = sqlite.prepare('SELECT onboarding_complete FROM users').get() as {
      onboarding_complete: number;
    };
    expect(row.onboarding_complete).toBe(1);
  });
});
