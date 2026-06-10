import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

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
  getOrCreateCurrentAllocation,
  lockAllocation,
} from '@/features/finance/budget/budget.service';
import { createExpense } from '@/features/finance/expenses/expenses.service';
import { createIncome } from '@/features/finance/income/income.service';
import { createProject } from '@/features/finance/projects/projects.service';
import {
  daysRemainingInMonth,
  getDashboardSnapshot,
  paceIndicator,
} from '@/features/finance/dashboard/dashboard.service';

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

// ---- paceIndicator (pure) ---------------------------------------------------

describe('paceIndicator', () => {
  it('returns green when under 75% spent', () => {
    expect(paceIndicator(50, 100, 10)).toBe('green');
  });

  it('returns yellow when >= 75% spent with days remaining', () => {
    expect(paceIndicator(75, 100, 10)).toBe('yellow');
    expect(paceIndicator(80, 100, 1)).toBe('yellow');
  });

  it('returns red when over budget', () => {
    expect(paceIndicator(101, 100, 10)).toBe('red');
  });

  it('returns green when exactly at budget (not strictly over)', () => {
    expect(paceIndicator(100, 100, 10)).toBe('green');
  });

  it('returns green when 75%+ spent but no days remaining', () => {
    expect(paceIndicator(75, 100, 0)).toBe('green');
  });

  it('returns green when budget is zero', () => {
    expect(paceIndicator(0, 0, 10)).toBe('green');
  });
});

// ---- daysRemainingInMonth (pure) -------------------------------------------

describe('daysRemainingInMonth', () => {
  it('returns correct days remaining mid-month (June has 30 days)', () => {
    expect(daysRemainingInMonth('2026-06', '2026-06-08')).toBe(22);
  });

  it('returns 0 on the last day of the month', () => {
    expect(daysRemainingInMonth('2026-06', '2026-06-30')).toBe(0);
  });

  it('returns 0 when today is in a later month', () => {
    expect(daysRemainingInMonth('2026-06', '2026-07-01')).toBe(0);
  });

  it('handles months with 31 days', () => {
    expect(daysRemainingInMonth('2026-01', '2026-01-15')).toBe(16);
  });
});

// ---- getDashboardSnapshot --------------------------------------------------

describe('getDashboardSnapshot', () => {
  const MONTH = '2026-06';
  const TODAY = '2026-06-08';

  it('returns todaySpending and zeroDay with nulls for budget/funds/topProject when includeBudgetData is false', async () => {
    await createExpense({
      amount: 3000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: false }, TODAY);

    expect(state.todaySpending).toBe(3000);
    expect(state.zeroDay.hasExpenses).toBe(true);
    expect(state.budget).toBeNull();
    expect(state.funds).toBeNull();
    expect(state.topProject).toBeNull();
  });

  it("sums only today's expenses, not the whole month's", async () => {
    await createExpense({
      amount: 2000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-07',
      isRecurring: false,
    });
    await createExpense({
      amount: 5000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: false }, TODAY);
    expect(state.todaySpending).toBe(5000);
  });

  it('populates budget, funds, and topProject when includeBudgetData is true', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: TODAY });
    await getOrCreateCurrentAllocation(MONTH);
    await lockAllocation(MONTH);
    await createExpense({
      amount: 5000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });
    await createProject({ name: 'E-commerce Launch', targetAmount: 500000 });

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: true }, TODAY);

    // budget — 100 000 × 65% = 65 000 expense allocation
    expect(state.budget).not.toBeNull();
    expect(state.budget!.expenseBudget).toBe(65000);
    expect(state.budget!.expensesRemaining).toBe(60000);
    expect(state.budget!.pace).toBe('green'); // 5 000 / 65 000 ≈ 7.7%

    // funds — seeds emergency + savings on first call
    expect(state.funds).not.toBeNull();
    expect(state.funds!.emergency.type).toBe('emergency');
    expect(state.funds!.savings.type).toBe('savings');

    // topProject
    expect(state.topProject).not.toBeNull();
    expect(state.topProject!.project.name).toBe('E-commerce Launch');
    expect(state.topProject!.pct).toBe(0);
  });

  it('returns yellow pace when >= 75% of expense budget spent with days remaining', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: TODAY });
    await getOrCreateCurrentAllocation(MONTH);
    await lockAllocation(MONTH);
    // 50 000 / 65 000 ≈ 76.9% — above the 75% threshold
    await createExpense({
      amount: 50000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: true }, TODAY);
    expect(state.budget!.pace).toBe('yellow');
  });

  it('returns red pace when over budget', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: TODAY });
    await getOrCreateCurrentAllocation(MONTH);
    await lockAllocation(MONTH);
    // 70 000 > 65 000
    await createExpense({
      amount: 70000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: true }, TODAY);
    expect(state.budget!.pace).toBe('red');
  });

  it('returns topProject null when no active projects exist', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: TODAY });
    await getOrCreateCurrentAllocation(MONTH);
    await lockAllocation(MONTH);

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: true }, TODAY);
    expect(state.topProject).toBeNull();
  });

  it('selects the lowest priority_rank active project as top project', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: TODAY });
    await getOrCreateCurrentAllocation(MONTH);
    await lockAllocation(MONTH);
    await createProject({ name: 'Priority One', targetAmount: 100000 });
    await createProject({ name: 'Priority Two', targetAmount: 200000 });

    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: true }, TODAY);
    expect(state.topProject!.project.name).toBe('Priority One');
  });

  it('returns zeroDay with no activity when nothing is logged', async () => {
    const state = await getDashboardSnapshot(MONTH, { includeBudgetData: false }, TODAY);
    expect(state.zeroDay.hasExpenses).toBe(false);
    expect(state.zeroDay.zeroDayConfirmed).toBe(false);
  });
});
