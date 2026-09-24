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

import { createExpense } from '@/features/finance/expenses/expenses.service';
import { createIncome } from '@/features/finance/income/income.service';
import {
  buildSpendingTrend,
  dailyBudgetPace,
  daysInMonth,
  daysRemainingInMonth,
  getDashboardSnapshot,
  paceIndicator,
  spentPct,
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

// ---- daysInMonth (pure) -----------------------------------------------------

describe('daysInMonth', () => {
  it('returns 30 for June', () => {
    expect(daysInMonth('2026-06')).toBe(30);
  });

  it('returns 31 for January', () => {
    expect(daysInMonth('2026-01')).toBe(31);
  });

  it('handles February in a non-leap year', () => {
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('handles February in a leap year', () => {
    expect(daysInMonth('2024-02')).toBe(29);
  });
});

// ---- spentPct (pure) --------------------------------------------------------

describe('spentPct', () => {
  it('returns the rounded percentage of budget spent', () => {
    expect(spentPct(50000, 65000)).toBe(77);
  });

  it('clamps to 100 when over budget', () => {
    expect(spentPct(70000, 65000)).toBe(100);
  });

  it('returns 0 when the budget is zero', () => {
    expect(spentPct(5000, 0)).toBe(0);
  });

  it('returns 0 when nothing is spent', () => {
    expect(spentPct(0, 65000)).toBe(0);
  });
});

// ---- dailyBudgetPace (pure) -------------------------------------------------

describe('dailyBudgetPace', () => {
  it('divides the expense budget across the days in the month', () => {
    expect(dailyBudgetPace(60000, '2026-06')).toBe(2000); // 60 000 / 30
  });

  it('returns 0 when there is no expense budget', () => {
    expect(dailyBudgetPace(0, '2026-06')).toBe(0);
  });
});

// ---- buildSpendingTrend (pure) ----------------------------------------------

describe('buildSpendingTrend', () => {
  it('buckets per-day totals for the 7 days ending today, oldest first', () => {
    const trend = buildSpendingTrend(
      [
        { date: '2026-06-08', amount: 5000 },
        { date: '2026-06-08', amount: 1000 },
        { date: '2026-06-07', amount: 2000 },
        { date: '2026-06-02', amount: 700 },
      ],
      '2026-06-08',
    );
    expect(trend).toEqual([700, 0, 0, 0, 0, 2000, 6000]);
  });

  it('spans month boundaries correctly', () => {
    const trend = buildSpendingTrend([{ date: '2026-05-29', amount: 400 }], '2026-06-03');
    expect(trend).toEqual([0, 400, 0, 0, 0, 0, 0]);
  });

  it('ignores expenses outside the window', () => {
    const trend = buildSpendingTrend([{ date: '2026-06-01', amount: 999 }], '2026-06-08');
    expect(trend).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

// ---- getDashboardSnapshot --------------------------------------------------

describe('getDashboardSnapshot', () => {
  const MONTH = '2026-06';
  const TODAY = '2026-06-08';

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

    const state = await getDashboardSnapshot(MONTH, TODAY);
    expect(state.todaySpending).toBe(5000);
    // The 7-day trend covers 2026-06-02 → 2026-06-08, oldest first.
    expect(state.spendingTrend).toEqual([0, 0, 0, 0, 0, 2000, 5000]);
  });

  it('populates budget and cashflow', async () => {
    await createIncome({
      amount: 100000,
      source: 'salary',
      note: null,
      date: TODAY,
      allocationStatus: 'allocated',
    });
    await createExpense({
      amount: 5000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, TODAY);

    // budget — the whole 100 000 income is the derived budget (VS-34)
    expect(state.budget).not.toBeNull();
    expect(state.budget!.expenseBudget).toBe(100000);
    expect(state.budget!.expensesLogged).toBe(5000);
    expect(state.budget!.expensesRemaining).toBe(95000);
    expect(state.budget!.spentPct).toBe(5);
    expect(state.budget!.pace).toBe('green');

    // cashflow — income 100 000 in, 5 000 out, net 95 000
    expect(state.cashflow).toEqual({ income: 100000, expenses: 5000, net: 95000 });

    // dailyPace — 100 000 / 30 days in June
    expect(state.dailyPace).toBeCloseTo(100000 / 30);

  });

  it('returns yellow pace when >= 75% of expense budget spent with days remaining', async () => {
    await createIncome({
      amount: 100000,
      source: 'salary',
      note: null,
      date: TODAY,
      allocationStatus: 'allocated',
    });
    // 80 000 / 100 000 = 80% — above the 75% threshold
    await createExpense({
      amount: 80000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, TODAY);
    expect(state.budget!.pace).toBe('yellow');
  });

  it('returns red pace when over budget', async () => {
    await createIncome({
      amount: 100000,
      source: 'salary',
      note: null,
      date: TODAY,
      allocationStatus: 'allocated',
    });
    // 110 000 > 100 000
    await createExpense({
      amount: 110000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, TODAY);
    expect(state.budget!.pace).toBe('red');
  });

  it('returns zeroDay with no activity when nothing is logged', async () => {
    const state = await getDashboardSnapshot(MONTH, TODAY);
    expect(state.zeroDay.hasExpenses).toBe(false);
    expect(state.zeroDay.zeroDayConfirmed).toBe(false);
  });

  it('carries the month and its remaining days, so the dashboard header need not recompute them', async () => {
    const state = await getDashboardSnapshot(MONTH, TODAY);
    expect(state.monthISO).toBe(MONTH);
    // June has 30 days; the 8th leaves 22 after today.
    expect(state.daysRemaining).toBe(22);
  });

  it('reports zero days remaining on the last day of the month', async () => {
    const state = await getDashboardSnapshot(MONTH, '2026-06-30');
    expect(state.daysRemaining).toBe(0);
  });
});
