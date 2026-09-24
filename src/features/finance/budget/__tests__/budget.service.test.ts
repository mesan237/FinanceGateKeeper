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

import { setTotalBudget } from '@/features/finance/budget/budget.envelopes';
import { checkOverBudget } from '@/features/finance/budget/budget.plan';
import {
  ensureMonthRow,
  getExpensesMonthlyTotal,
  getIncomeMonthlyTotal,
  getMonthlyBudget,
} from '@/features/finance/budget/budget.service';
import { createExpense } from '@/features/finance/expenses/expenses.service';
import { createIncome } from '@/features/finance/income/income.service';

let sqlite: Database.Database;

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

async function spend(date: string, amount: number): Promise<void> {
  await createExpense({
    amount,
    categoryId: 1,
    subcategoryId: null,
    note: null,
    date,
    isRecurring: false,
  });
}

describe('getExpensesMonthlyTotal', () => {
  it('sums only expenses whose date is in the target month', async () => {
    // VS-03 seeds default categories (id=1 is the first parent); use it.
    await createExpense({
      amount: 5000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-05',
      isRecurring: false,
    });
    await createExpense({
      amount: 12000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-20',
      isRecurring: false,
    });
    await createExpense({
      amount: 99999,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-07-01',
      isRecurring: false,
    });

    expect(await getExpensesMonthlyTotal('2026-06')).toBe(17000);
  });

  it('returns 0 when no expenses match the month', async () => {
    expect(await getExpensesMonthlyTotal('2026-06')).toBe(0);
  });
});

describe('ensureMonthRow', () => {
  it('creates the row that carries the explicit total', async () => {
    await ensureMonthRow('2026-06');
    await setTotalBudget('2026-06', 250_000);

    const budget = await getMonthlyBudget('2026-06');
    expect(budget.month).toBe('2026-06');
  });

  it('is idempotent — a second call does not insert a duplicate', async () => {
    await ensureMonthRow('2026-06');
    await ensureMonthRow('2026-06');

    const rows = sqlite
      .prepare('SELECT COUNT(*) AS n FROM allocations WHERE month = ?')
      .all('2026-06') as { n: number }[];
    expect(rows[0].n).toBe(1);
  });
});

describe('getIncomeMonthlyTotal', () => {
  it('sums only income whose date is in the target month', async () => {
    await createIncome({ amount: 350_000, source: 'salary', note: null, date: '2026-06-12' });
    await createIncome({ amount: 75_000, source: 'freelance', note: null, date: '2026-06-20' });
    await createIncome({ amount: 900_000, source: 'salary', note: null, date: '2026-07-01' });

    expect(await getIncomeMonthlyTotal('2026-06')).toBe(425_000);
  });

  it('counts legacy pending rows too', async () => {
    // Before VS-34 this filtered on allocation_status = 'allocated', so income
    // left in the unallocated pool vanished from the month. Nothing holds a row
    // pending any more, and a real franc earned should never go unreported.
    await createIncome({
      amount: 300_000,
      source: 'freelance',
      note: null,
      date: '2026-06-20',
      allocationStatus: 'pending',
    });

    expect(await getIncomeMonthlyTotal('2026-06')).toBe(300_000);
  });

  it('returns 0 when no income matches the month', async () => {
    expect(await getIncomeMonthlyTotal('2026-06')).toBe(0);
  });
});

describe('getMonthlyBudget', () => {
  it('composes income in, expenses out, and what is left', async () => {
    await createIncome({ amount: 350_000, source: 'salary', note: null, date: '2026-06-12' });
    await createIncome({ amount: 75_000, source: 'freelance', note: null, date: '2026-06-20' });
    await spend('2026-06-10', 5_000);
    await spend('2026-06-15', 12_000);

    const budget = await getMonthlyBudget('2026-06');

    expect(budget.incomeTotal).toBe(425_000);
    expect(budget.expensesLogged).toBe(17_000);
    expect(budget.expensesRemaining).toBe(408_000);
  });

  it('returns a coherent zero view when nothing is logged yet', async () => {
    const budget = await getMonthlyBudget('2026-06');

    expect(budget).toEqual({
      month: '2026-06',
      incomeTotal: 0,
      expensesLogged: 0,
      expensesRemaining: 0,
    });
  });
});

describe('checkOverBudget', () => {
  /** 400,000 income and no explicit total — so the derived budget is 400,000. */
  async function seedJune(): Promise<void> {
    await createIncome({ amount: 400_000, source: 'salary', note: null, date: '2026-06-12' });
    await ensureMonthRow('2026-06');
  }

  it('reports not over when the expense stays within the budget', async () => {
    await seedJune();
    await spend('2026-06-10', 100_000);

    const check = await checkOverBudget('2026-06', 50_000);

    expect(check.expenseBudget).toBe(400_000);
    expect(check.isOver).toBe(false);
    expect(check.overage).toBe(0);
  });

  it('reports over with the exact overage when the expense exceeds the budget', async () => {
    await seedJune();
    await spend('2026-06-10', 380_000);

    const check = await checkOverBudget('2026-06', 30_000);

    expect(check.isOver).toBe(true);
    expect(check.overage).toBe(10_000);
  });

  it('treats an expense landing exactly on the budget as not over', async () => {
    await seedJune();
    await spend('2026-06-10', 350_000);

    expect((await checkOverBudget('2026-06', 50_000)).isOver).toBe(false);
  });

  it('honours an explicit total over the derived income figure', async () => {
    await seedJune();
    await setTotalBudget('2026-06', 120_000);

    const check = await checkOverBudget('2026-06', 130_000);

    expect(check.expenseBudget).toBe(120_000);
    expect(check.isOver).toBe(true);
  });

  it('stays silent while the month has no budget to exceed', async () => {
    // No income, no explicit total. The month lock used to keep the guard quiet
    // here; now the absence of any budget does. Either way, logging an expense
    // into an unplanned month is never interrupted.
    await ensureMonthRow('2026-06');

    expect((await checkOverBudget('2026-06', 999_999)).isOver).toBe(false);
  });
});
