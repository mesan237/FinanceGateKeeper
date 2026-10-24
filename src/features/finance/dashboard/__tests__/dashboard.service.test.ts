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

import { execute } from '@/services/database';
import { setTotalBudget } from '@/features/finance/budget/budget.envelopes';
import { ensureMonthRow } from '@/features/finance/budget/budget.service';
import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';
import { createIncome } from '@/features/finance/income/income.service';
import {
  buildSpendingTrend,
  dailyBudgetPace,
  daysInMonth,
  daysRemainingInMonth,
  daysSoFarInMonth,
  getDashboardSnapshot,
  paceFromHealth,
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

// ---- paceFromHealth (pure) ------------------------------------------------

describe('paceFromHealth (VS-40)', () => {
  it('maps the shared budget health verdict onto the dashboard colours', () => {
    expect(paceFromHealth('on_track')).toBe('green');
    expect(paceFromHealth('at_risk')).toBe('yellow');
    expect(paceFromHealth('over')).toBe('red');
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

describe('daysSoFarInMonth', () => {
  it('is the day of the month while the month runs, today included', () => {
    expect(daysSoFarInMonth('2026-06', '2026-06-01')).toBe(1);
    expect(daysSoFarInMonth('2026-06', '2026-06-08')).toBe(8);
  });

  it('is every day once the month is over, and none before it starts', () => {
    expect(daysSoFarInMonth('2026-06', '2026-07-03')).toBe(30);
    expect(daysSoFarInMonth('2026-06', '2026-05-31')).toBe(0);
  });
});

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

    // cashflow — income 100 000 in, 5 000 out
    expect(state.cashflow).toEqual({ income: 100000, expenses: 5000 });
  });

  it('treats income alone as no plan, as the Budget tab does (UX-04)', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: TODAY });

    const state = await getDashboardSnapshot(MONTH, TODAY);

    expect(state.budget!.isPlanned).toBe(false);
    // No plan, no pace to be measured against.
    expect(state.dailyPace).toBeNull();
  });

  it('counts a month with an explicit total as planned, with a daily pace', async () => {
    await ensureMonthRow(MONTH);
    await setTotalBudget(MONTH, 90000);

    const state = await getDashboardSnapshot(MONTH, TODAY);

    expect(state.budget!.isPlanned).toBe(true);
    expect(state.dailyPace).toBeCloseTo(90000 / 30);
  });

  it('counts an expected-income month as planned (VS-47)', async () => {
    await execute(
      `INSERT INTO baseline_facts (kind, value, source, created_at)
       VALUES ('monthly_income', 250000, 'user', '2026-06-01T08:00:00Z')`,
    );

    const state = await getDashboardSnapshot(MONTH, TODAY);

    expect(state.budget!.isPlanned).toBe(true);
  });

  it('counts the days logged so far this month, spending or a no-spend day (UX-04)', async () => {
    const expense = { amount: 1000, categoryId: 1, subcategoryId: null, note: null, isRecurring: false };
    await createExpense({ ...expense, date: '2026-06-01' });
    await createExpense({ ...expense, date: '2026-06-01' });
    await createExpense({ ...expense, date: '2026-06-03' });
    await confirmZeroDay('2026-06-04');
    // Last month does not count towards this one.
    await createExpense({ ...expense, date: '2026-05-31' });

    const state = await getDashboardSnapshot(MONTH, TODAY);

    expect(state.logging).toEqual({ loggedDays: 3, daysSoFar: 8 });
  });

  it('budgets on expected income but reports only income received (VS-47)', async () => {
    await execute(
      `INSERT INTO baseline_facts (kind, value, source, created_at)
       VALUES ('monthly_income', 250000, 'user', '2026-06-01T08:00:00Z')`,
    );
    await createIncome({ amount: 40000, source: 'freelance', note: null, date: TODAY });

    const state = await getDashboardSnapshot(MONTH, TODAY);

    expect(state.budget!.expenseBudget).toBe(250000);
    expect(state.cashflow!.income).toBe(40000);
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

  it('agrees with the Budget tab: a run-rate that overshoots is yellow even under 75% (VS-40)', async () => {
    await createIncome({ amount: 100000, source: 'salary', note: null, date: '2026-06-01' });
    // 40% spent by the 8th projects to 150 000 against 100 000.
    await createExpense({
      amount: 40000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: TODAY,
      isRecurring: false,
    });

    const state = await getDashboardSnapshot(MONTH, TODAY);
    expect(state.budget!.pace).toBe('yellow');
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
