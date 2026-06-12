import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Route the database helpers the service imports to a per-test in-memory
// better-sqlite3 instance. The SQL engine is real (no SQLite mocking) — only
// the connection is swapped, so the real migrations and queries run.
const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import {
  createIncome,
  getAllIncome,
  getIncomeByDateRange,
  getIncomeBySource,
  getMonthlyTotal,
  getPendingIncome,
  markIncomeAllocated,
} from '@/features/finance/income/income.service';
import type { NewIncome } from '@/features/finance/income/income.types';

let sqlite: Database.Database;

function newIncome(overrides: Partial<NewIncome> = {}): NewIncome {
  return {
    amount: 350000,
    source: 'salary',
    note: null,
    date: '2026-06-12',
    ...overrides,
  };
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  // better-sqlite3's bind-param types are stricter than the driver's structural
  // shape (null vs {}); the cast bridges that gap without loosening to `any`.
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('account attribution (VS-18)', () => {
  it('persists accountId on create and exposes it on read', async () => {
    // accounts seeded by migration 018 (Cash = 1).
    const id = await createIncome(newIncome({ amount: 1000, accountId: 1 }));
    const all = await getAllIncome();
    expect(all.find((i) => i.id === id)?.accountId).toBe(1);
  });

  it('defaults accountId to null when not supplied', async () => {
    const id = await createIncome(newIncome({ amount: 1000 }));
    const all = await getAllIncome();
    expect(all.find((i) => i.id === id)?.accountId).toBeNull();
  });
});

describe('createIncome / getAllIncome', () => {
  it('creates an income and includes it in getAllIncome', async () => {
    const id = await createIncome(newIncome({ amount: 350000, source: 'salary' }));
    expect(id).toBeGreaterThan(0);

    const all = await getAllIncome();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id, amount: 350000, source: 'salary', date: '2026-06-12' });
  });

  it('persists amounts as integers (no decimal coercion)', async () => {
    const id = await createIncome(newIncome({ amount: 425000 }));
    const stored = sqlite.prepare('SELECT amount FROM income WHERE id = ?').get(id) as {
      amount: number;
    };
    expect(stored.amount).toBe(425000);
    expect(Number.isInteger(stored.amount)).toBe(true);
  });

  it('orders results newest-first by date then created_at', async () => {
    await createIncome(newIncome({ date: '2026-06-01' }));
    await createIncome(newIncome({ date: '2026-06-20' }));
    await createIncome(newIncome({ date: '2026-06-10' }));

    const all = await getAllIncome();
    expect(all.map((e) => e.date)).toEqual(['2026-06-20', '2026-06-10', '2026-06-01']);
  });

  it('rejects a zero or negative amount without inserting a row', async () => {
    await expect(createIncome(newIncome({ amount: 0 }))).rejects.toThrow();
    await expect(createIncome(newIncome({ amount: -500 }))).rejects.toThrow();
    expect(await getAllIncome()).toHaveLength(0);
  });

  it('rejects an unknown source via the runtime guard, before the DB CHECK', async () => {
    // Asserting the guard's own message (not just any throw) proves the runtime
    // INCOME_SOURCE_VALUES check rejected it — the DB CHECK constraint would
    // surface a different SQLite error. This locks Design Decision #4.
    await expect(
      createIncome(newIncome({ source: 'gift' as unknown as NewIncome['source'] })),
    ).rejects.toThrow(/Unknown income source/);
    expect(await getAllIncome()).toHaveLength(0);
  });
});

describe('getIncomeBySource', () => {
  it('returns only rows for the given source', async () => {
    await createIncome(newIncome({ source: 'salary' }));
    await createIncome(newIncome({ source: 'freelance' }));
    await createIncome(newIncome({ source: 'salary' }));

    const salary = await getIncomeBySource('salary');
    expect(salary).toHaveLength(2);
    expect(salary.every((r) => r.source === 'salary')).toBe(true);
  });

  it('returns empty when no rows match the source', async () => {
    await createIncome(newIncome({ source: 'salary' }));
    expect(await getIncomeBySource('ecommerce')).toEqual([]);
  });
});

describe('getIncomeByDateRange', () => {
  it('returns only income within the inclusive range', async () => {
    await createIncome(newIncome({ date: '2026-06-01' }));
    await createIncome(newIncome({ date: '2026-06-15' }));
    await createIncome(newIncome({ date: '2026-07-01' }));

    const inJune = await getIncomeByDateRange('2026-06-01', '2026-06-30');
    expect(inJune.map((e) => e.date)).toEqual(['2026-06-15', '2026-06-01']);
  });

  it('returns empty when nothing matches', async () => {
    await createIncome(newIncome({ date: '2026-06-15' }));
    expect(await getIncomeByDateRange('2026-01-01', '2026-01-31')).toEqual([]);
  });
});

describe('getMonthlyTotal', () => {
  it('sums amounts across mixed sources within the same month', async () => {
    await createIncome(newIncome({ amount: 350000, source: 'salary', date: '2026-06-12' }));
    await createIncome(newIncome({ amount: 75000, source: 'freelance', date: '2026-06-20' }));

    expect(await getMonthlyTotal('2026-06')).toBe(425000);
  });

  it('ignores rows from other months', async () => {
    await createIncome(newIncome({ amount: 100000, date: '2026-06-30' }));
    await createIncome(newIncome({ amount: 999000, date: '2026-07-01' }));
    await createIncome(newIncome({ amount: 888000, date: '2026-05-31' }));

    expect(await getMonthlyTotal('2026-06')).toBe(100000);
  });

  it('returns 0 when no rows match the month', async () => {
    await createIncome(newIncome({ date: '2026-06-12' }));
    expect(await getMonthlyTotal('2026-01')).toBe(0);
  });

  it('counts both pending and allocated income (status-agnostic)', async () => {
    await createIncome(newIncome({ amount: 100000, date: '2026-06-01' })); // pending
    const allocated = await createIncome(newIncome({ amount: 50000, date: '2026-06-02' }));
    await markIncomeAllocated(allocated);

    expect(await getMonthlyTotal('2026-06')).toBe(150000);
  });
});

describe('allocation status (VS-19)', () => {
  it('creates new income as pending by default', async () => {
    const id = await createIncome(newIncome({ amount: 1000 }));
    const all = await getAllIncome();
    expect(all.find((i) => i.id === id)?.allocationStatus).toBe('pending');
  });

  it('honours an explicit allocated status on create', async () => {
    const id = await createIncome(newIncome({ amount: 1000, allocationStatus: 'allocated' }));
    const all = await getAllIncome();
    expect(all.find((i) => i.id === id)?.allocationStatus).toBe('allocated');
  });

  it('getPendingIncome returns only pending rows, newest-first', async () => {
    const a = await createIncome(newIncome({ amount: 1000, date: '2026-06-01' }));
    await createIncome(newIncome({ amount: 2000, date: '2026-06-20' }));
    await markIncomeAllocated(a);

    const pending = await getPendingIncome();
    expect(pending).toHaveLength(1);
    expect(pending[0].amount).toBe(2000);
    expect(pending.every((i) => i.allocationStatus === 'pending')).toBe(true);
  });

  it('markIncomeAllocated flips a pending row to allocated', async () => {
    const id = await createIncome(newIncome({ amount: 1000 }));
    await markIncomeAllocated(id);

    const all = await getAllIncome();
    expect(all.find((i) => i.id === id)?.allocationStatus).toBe('allocated');
    expect(await getPendingIncome()).toEqual([]);
  });
});
