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

function costTypeOf(name: string, parent: boolean): string | null {
  const row = sqlite
    .prepare(
      `SELECT cost_type FROM categories WHERE name = ? AND parent_id IS ${parent ? 'NULL' : 'NOT NULL'}`,
    )
    .get(name) as { cost_type: string | null };
  return row.cost_type;
}

describe('migration 036 — fixed or variable categories', () => {
  it('tags the default Bills category as fixed', () => {
    expect(costTypeOf('Bills', true)).toBe('fixed');
  });

  it('leaves every other parent untagged, which reads as variable', () => {
    expect(costTypeOf('Food', true)).toBeNull();
    expect(costTypeOf('Transport', true)).toBeNull();
  });

  it('leaves subcategories untagged so they inherit their parent', () => {
    expect(costTypeOf('Rent', false)).toBeNull();
  });

  it('rejects a value that is neither fixed nor variable', () => {
    expect(() => sqlite.prepare(`UPDATE categories SET cost_type = 'monthly' WHERE id = 1`).run()).toThrow();
  });

  it('marks a category pending when only its cost type changes', () => {
    sqlite
      .prepare(`UPDATE categories SET updated_at = '2000-01-01T00:00:00.000Z', sync_status = 'synced'`)
      .run();

    sqlite.prepare(`UPDATE categories SET cost_type = 'fixed' WHERE id = 1`).run();

    const row = sqlite.prepare('SELECT sync_status FROM categories WHERE id = 1').get() as {
      sync_status: string;
    };
    expect(row.sync_status).toBe('pending');
  });
});
