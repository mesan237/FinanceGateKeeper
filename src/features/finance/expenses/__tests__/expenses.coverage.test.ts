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
  getMonthCoverage,
  monthCoverage,
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
