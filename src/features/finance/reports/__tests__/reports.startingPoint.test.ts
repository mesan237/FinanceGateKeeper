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

import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';
import {
  getStartingPoint,
  pickStartingMonths,
  STARTING_MONTHS,
} from '@/features/finance/reports/reports.startingPoint';

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

const FOOD = 1;

async function spend(date: string, amount: number): Promise<void> {
  await createExpense({ amount, categoryId: FOOD, subcategoryId: null, note: null, date, isRecurring: false });
}

/** Confirms a no-spend day for days `from`..`to` of the month, so they count as logged. */
async function logDays(month: string, from: number, to: number): Promise<void> {
  for (let d = from; d <= to; d += 1) await confirmZeroDay(`${month}-${String(d).padStart(2, '0')}`);
}

async function logWholeMonth(month: string): Promise<void> {
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  await logDays(month, 1, days);
}

describe('pickStartingMonths (VS-58)', () => {
  it('takes the first three complete months, oldest first, skipping incomplete ones', () => {
    const months = [
      { month: '2026-04', coverage: 0.5, isComplete: false },
      { month: '2026-05', coverage: 0.9, isComplete: true },
      { month: '2026-06', coverage: 0.3, isComplete: false },
      { month: '2026-07', coverage: 1, isComplete: true },
      { month: '2026-08', coverage: 0.85, isComplete: true },
      { month: '2026-09', coverage: 1, isComplete: true },
    ];

    expect(pickStartingMonths(months).map((m) => m.month)).toEqual(['2026-05', '2026-07', '2026-08']);
    expect(STARTING_MONTHS).toBe(3);
  });
});

describe('getStartingPoint (VS-58)', () => {
  it('has nothing recorded before the first entry', async () => {
    expect(await getStartingPoint('2026-10-15')).toEqual({ recorded: [], needed: 3, profile: null });
  });

  it('counts complete months so far while the starting point is being recorded', async () => {
    await logWholeMonth('2026-08');
    await spend('2026-08-05', 40_000);
    await logDays('2026-09', 1, 10);

    const point = await getStartingPoint('2026-10-15');

    expect(point.recorded).toEqual(['2026-08']);
    expect(point.profile).toBeNull();
  });

  it('never counts the month still running, however well it is logged', async () => {
    await logDays('2026-10', 1, 15);

    expect((await getStartingPoint('2026-10-15')).recorded).toEqual([]);
  });

  it('skips a half-logged first month and keeps the starting point fixed afterwards', async () => {
    // Started on the 16th of May: too little of it is logged to count.
    await logDays('2026-05', 16, 31);
    await spend('2026-05-20', 5_000);
    for (const [month, amount] of [
      ['2026-06', 30_000],
      ['2026-07', 60_000],
      ['2026-08', 90_000],
      ['2026-09', 10_000],
    ] as const) {
      await logWholeMonth(month);
      await spend(`${month}-10`, amount);
    }

    const point = await getStartingPoint('2026-10-15');

    expect(point.recorded).toEqual(['2026-06', '2026-07', '2026-08']);
    // September's cheaper month is "now", not the starting point.
    expect(point.profile?.average?.total).toBe(60_000);
    expect(point.profile?.months.map((m) => m.month)).toEqual(['2026-06', '2026-07', '2026-08']);
  });
});
