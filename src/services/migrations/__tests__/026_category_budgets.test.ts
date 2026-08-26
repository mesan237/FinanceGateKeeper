import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

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

async function columnsOf(table: string): Promise<string[]> {
  const info = await driver.query<{ name: string }>(`PRAGMA table_info(${table})`);
  return info.map((c) => c.name);
}

describe('migration 026 — category_budgets', () => {
  it('creates the table with its envelope columns', async () => {
    const cols = await columnsOf('category_budgets');
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'month',
        'category_id',
        'allocated_amount',
        'rollover_enabled',
        'created_at',
      ]),
    );
  });

  it('defaults rollover_enabled to off', async () => {
    await driver.execute(
      `INSERT INTO category_budgets (month, category_id, allocated_amount, created_at)
       VALUES ('2026-08', 1, 40000, '2026-08-01T00:00:00Z')`,
    );
    const [row] = await driver.query<{ rollover_enabled: number }>(
      'SELECT rollover_enabled FROM category_budgets',
    );
    expect(row.rollover_enabled).toBe(0);
  });

  it('declares a unique index over (month, category_id)', async () => {
    const indexes = await driver.query<{ name: string; unique: number }>(
      'PRAGMA index_list(category_budgets)',
    );

    const uniqueColumnSets: string[][] = [];
    for (const index of indexes.filter((i) => i.unique === 1)) {
      const info = await driver.query<{ name: string; seqno: number }>(
        `PRAGMA index_info('${index.name}')`,
      );
      uniqueColumnSets.push([...info].sort((a, b) => a.seqno - b.seqno).map((c) => c.name));
    }

    expect(uniqueColumnSets).toContainEqual(['month', 'category_id']);
  });

  it('keeps a single envelope per category per month', async () => {
    const insert = `INSERT INTO category_budgets (month, category_id, allocated_amount, created_at)
                    VALUES ('2026-08', 1, 40000, '2026-08-01T00:00:00Z')`;
    await driver.execute(insert);
    // Asserting the surviving row count rather than the thrown error: this
    // repo has a documented intermittent where better-sqlite3 constraint
    // violations do not surface as rejections under full-suite load (see the
    // VS-32 note on `importData` rollback). The invariant that matters is that
    // a duplicate never lands, and that holds either way.
    await driver.execute(insert).catch(() => undefined);

    const rows = await driver.query('SELECT id FROM category_budgets');
    expect(rows).toHaveLength(1);
  });

  it('allows the same category in a different month', async () => {
    await driver.execute(
      `INSERT INTO category_budgets (month, category_id, allocated_amount, created_at)
       VALUES ('2026-08', 1, 40000, '2026-08-01T00:00:00Z')`,
    );
    await driver.execute(
      `INSERT INTO category_budgets (month, category_id, allocated_amount, created_at)
       VALUES ('2026-09', 1, 45000, '2026-09-01T00:00:00Z')`,
    );
    const rows = await driver.query('SELECT id FROM category_budgets');
    expect(rows).toHaveLength(2);
  });
});

describe('migration 027 — allocations.total_budget', () => {
  it('adds the column', async () => {
    expect(await columnsOf('allocations')).toContain('total_budget');
  });

  it('leaves it NULL so existing months keep the derived total', async () => {
    await driver.execute(
      `INSERT INTO allocations
         (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
          priority_order, is_locked, created_at)
       VALUES ('2026-08', 10, 10, 15, 65, '[]', 0, '2026-08-01T00:00:00Z')`,
    );
    const [row] = await driver.query<{ total_budget: number | null }>(
      'SELECT total_budget FROM allocations',
    );
    expect(row.total_budget).toBeNull();
  });
});

describe('migration 028 — sync wiring', () => {
  it('lists category_budgets as a synced table', () => {
    expect(SYNCED_TABLES).toContain('category_budgets');
  });

  it('provisions the sync metadata columns', async () => {
    const cols = await columnsOf('category_budgets');
    expect(cols).toEqual(expect.arrayContaining(['uuid', 'updated_at', 'sync_status']));
  });

  it('stamps a uuid and marks a new envelope pending', async () => {
    await driver.execute(
      `INSERT INTO category_budgets (month, category_id, allocated_amount, created_at)
       VALUES ('2026-08', 1, 40000, '2026-08-01T00:00:00Z')`,
    );
    const [row] = await driver.query<{ uuid: string | null; sync_status: string }>(
      'SELECT uuid, sync_status FROM category_budgets',
    );
    expect(row.uuid).toEqual(expect.any(String));
    expect(row.sync_status).toBe('pending');
  });

  it('re-marks an envelope pending when its amount changes', async () => {
    await driver.execute(
      `INSERT INTO category_budgets (month, category_id, allocated_amount, created_at)
       VALUES ('2026-08', 1, 40000, '2026-08-01T00:00:00Z')`,
    );
    await driver.execute(`UPDATE category_budgets SET sync_status = 'synced'`);
    await driver.execute(`UPDATE category_budgets SET allocated_amount = 50000`);

    const [row] = await driver.query<{ sync_status: string }>(
      'SELECT sync_status FROM category_budgets',
    );
    expect(row.sync_status).toBe('pending');
  });

  it('re-marks an allocation pending when its explicit total changes', async () => {
    await driver.execute(
      `INSERT INTO allocations
         (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
          priority_order, is_locked, created_at)
       VALUES ('2026-08', 10, 10, 15, 65, '[]', 0, '2026-08-01T00:00:00Z')`,
    );
    await driver.execute(`UPDATE allocations SET sync_status = 'synced'`);
    await driver.execute(`UPDATE allocations SET total_budget = 250000`);

    const [row] = await driver.query<{ sync_status: string }>(
      'SELECT sync_status FROM allocations',
    );
    expect(row.sync_status).toBe('pending');
  });
});
