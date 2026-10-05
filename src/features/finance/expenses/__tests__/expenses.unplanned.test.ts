import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Real SQL on an in-memory database; only the connection is swapped.
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
  createExpense,
  getExpenseById,
  getExpensesByDateRange,
  updateExpense,
} from '@/features/finance/expenses/expenses.service';
import type { NewExpense } from '@/features/finance/expenses/expenses.types';
import { getUnplannedTotals } from '@/features/finance/expenses/expenses.unplanned';
import { getTransactionFeed } from '@/services/transactions';

let sqlite: Database.Database;

function newExpense(overrides: Partial<NewExpense> = {}): NewExpense {
  return {
    amount: 1500,
    categoryId: 1,
    subcategoryId: null,
    note: null,
    date: '2026-10-02',
    isRecurring: false,
    ...overrides,
  };
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('the imprévu flag', () => {
  it('saves an expense as planned unless it is marked unplanned', async () => {
    const id = await createExpense(newExpense());
    expect((await getExpenseById(id))?.isUnplanned).toBe(false);
  });

  it('saves an expense marked unplanned', async () => {
    const id = await createExpense(newExpense({ isUnplanned: true }));
    expect((await getExpenseById(id))?.isUnplanned).toBe(true);
  });

  it('flags and unflags an existing expense', async () => {
    const id = await createExpense(newExpense());
    await updateExpense(id, { isUnplanned: true });
    expect((await getExpenseById(id))?.isUnplanned).toBe(true);
    await updateExpense(id, { isUnplanned: false });
    expect((await getExpenseById(id))?.isUnplanned).toBe(false);
  });

  it('exposes the flag on date-range reads', async () => {
    await createExpense(newExpense({ isUnplanned: true }));
    const [expense] = await getExpensesByDateRange('2026-10-01', '2026-10-31');
    expect(expense.isUnplanned).toBe(true);
  });

  it('carries the flag onto the transaction feed', async () => {
    const id = await createExpense(newExpense({ isUnplanned: true }));
    await createExpense(newExpense());
    const feed = await getTransactionFeed('2026-10');
    const flagged = feed.filter((e) => e.type === 'expense' && e.isUnplanned);
    expect(flagged.map((e) => e.id)).toEqual([id]);
  });
});

describe('getUnplannedTotals', () => {
  it('counts and sums only the unplanned expenses in the range', async () => {
    await createExpense(newExpense({ amount: 2000, isUnplanned: true }));
    await createExpense(newExpense({ amount: 3500, date: '2026-10-20', isUnplanned: true }));
    await createExpense(newExpense({ amount: 9000 }));
    // Outside the range.
    await createExpense(newExpense({ amount: 7000, date: '2026-09-30', isUnplanned: true }));

    expect(await getUnplannedTotals('2026-10-01', '2026-10-31')).toEqual({
      count: 2,
      total: 5500,
    });
  });

  it('returns zeros for a month with no imprévus', async () => {
    await createExpense(newExpense());
    expect(await getUnplannedTotals('2026-10-01', '2026-10-31')).toEqual({ count: 0, total: 0 });
  });
});
