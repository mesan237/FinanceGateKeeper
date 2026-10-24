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
  COMPLETE_MONTH_COVERAGE,
  getFirstLoggedDate,
  getMonthCoverage,
  missedDays,
  monthCoverage,
  monthLoggingStatus,
} from '@/features/finance/expenses/expenses.coverage';
import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';

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

function day(n: number): string {
  return `2026-06-${String(n).padStart(2, '0')}`;
}

describe('monthCoverage (VS-41)', () => {
  it('is the share of the month with an expense or a confirmed zero-spend day', () => {
    const logged = new Set([day(1), day(2), day(3)]);
    const coverage = monthCoverage('2026-06', logged);

    expect(coverage).toMatchObject({ month: '2026-06', loggedDays: 3, daysInMonth: 30 });
    expect(coverage.coverage).toBeCloseTo(0.1);
    expect(coverage.isComplete).toBe(false);
  });

  it(`calls a month complete from ${COMPLETE_MONTH_COVERAGE * 100}% of its days`, () => {
    const logged = new Set(Array.from({ length: 24 }, (_, i) => day(i + 1)));
    expect(monthCoverage('2026-06', logged).isComplete).toBe(true);

    logged.delete(day(24));
    expect(monthCoverage('2026-06', logged).isComplete).toBe(false);
  });

  it('ignores days that belong to another month', () => {
    expect(monthCoverage('2026-06', new Set(['2026-07-01'])).loggedDays).toBe(0);
  });
});

describe('getMonthCoverage', () => {
  it('counts each day once, whether it holds expenses, a zero-day, or several expenses', async () => {
    const base = { categoryId: 1, subcategoryId: null, note: null, isRecurring: false };
    await createExpense({ ...base, amount: 1_000, date: day(1) });
    await createExpense({ ...base, amount: 2_000, date: day(1) });
    await confirmZeroDay(day(2));
    await createExpense({ ...base, amount: 3_000, date: '2026-07-01' });

    const coverage = await getMonthCoverage('2026-06');

    expect(coverage.loggedDays).toBe(2);
  });

  it('treats a user who started mid-month as an incomplete month', async () => {
    for (let n = 16; n <= 30; n += 1) await confirmZeroDay(day(n));

    expect((await getMonthCoverage('2026-06')).isComplete).toBe(false);
  });
});

describe('missedDays (UX-06)', () => {
  it('lists the days in the range with neither an expense nor a no-spend day, newest first', () => {
    const logged = new Set([day(3), day(5)]);
    expect(missedDays(day(2), day(6), logged)).toEqual([day(6), day(4), day(2)]);
  });

  it('crosses month ends', () => {
    expect(missedDays('2026-05-31', day(1), new Set())).toEqual([day(1), '2026-05-31']);
  });

  it('is empty when the range is empty', () => {
    expect(missedDays(day(5), day(4), new Set())).toEqual([]);
  });
});

describe('monthLoggingStatus (UX-05)', () => {
  it('says how much of the month so far is logged and what the month needs', () => {
    const logged = new Set(Array.from({ length: 18 }, (_, i) => day(i + 1)));
    expect(monthLoggingStatus('2026-06', day(23), logged, 0)).toEqual({
      month: '2026-06',
      loggedDays: 18,
      daysSoFar: 23,
      daysInMonth: 30,
      needed: 24,
      canStillCount: true,
    });
  });

  it('counts today and the days left, and the missed days that can still be marked', () => {
    // Day 23 of 30, 10 logged: 8 days ahead (today included) + 6 recoverable = 24.
    const logged = new Set(Array.from({ length: 10 }, (_, i) => day(i + 1)));
    expect(monthLoggingStatus('2026-06', day(23), logged, 6).canStillCount).toBe(true);
    expect(monthLoggingStatus('2026-06', day(23), logged, 5).canStillCount).toBe(false);
  });

  it('does not count today twice once it is logged', () => {
    const logged = new Set(Array.from({ length: 17 }, (_, i) => day(i + 7)));
    // Days 7–23 logged (17), today included; 7 days ahead = 24.
    expect(monthLoggingStatus('2026-06', day(23), logged, 0).canStillCount).toBe(true);
  });

  it('knows a month started on the 8th can never reach 80% without back-logging', () => {
    expect(monthLoggingStatus('2026-06', day(8), new Set([day(8)]), 0).canStillCount).toBe(false);
  });
});

describe('getFirstLoggedDate', () => {
  it('is the earliest day with an expense or a no-spend day', async () => {
    const base = { categoryId: 1, subcategoryId: null, note: null, isRecurring: false };
    await createExpense({ ...base, amount: 1_000, date: day(18) });
    await confirmZeroDay(day(12));

    expect(await getFirstLoggedDate()).toBe(day(12));
  });

  it('is null before anything is logged', async () => {
    expect(await getFirstLoggedDate()).toBeNull();
  });
});

describe('confirmZeroDay guard (UX-06)', () => {
  it('refuses to mark a day with spending as a no-spend day', async () => {
    const base = { categoryId: 1, subcategoryId: null, note: null, isRecurring: false };
    await createExpense({ ...base, amount: 1_000, date: day(4) });

    await expect(confirmZeroDay(day(4))).rejects.toThrow('That day already has spending');
    expect((await getMonthCoverage('2026-06')).loggedDays).toBe(1);
  });

  it('still marks a day with no spending, earlier days included', async () => {
    await confirmZeroDay(day(4));
    expect((await getMonthCoverage('2026-06')).loggedDays).toBe(1);
  });
});
