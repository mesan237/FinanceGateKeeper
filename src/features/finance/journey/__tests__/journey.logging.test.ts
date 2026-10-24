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
import { getObserveLogging, markNoSpendDay } from '@/features/finance/journey/journey.logging';

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

const TODAY = '2026-10-15';

function oct(day: number): string {
  return `2026-10-${String(day).padStart(2, '0')}`;
}

async function spend(date: string): Promise<void> {
  await createExpense({ amount: 1_000, categoryId: 1, subcategoryId: null, note: null, date, isRecurring: false });
}

describe('getObserveLogging (UX-05)', () => {
  it('says how much of the running month is logged and what it needs', async () => {
    for (let d = 1; d <= 12; d += 1) await spend(oct(d));

    const logging = await getObserveLogging(TODAY);

    expect(logging).toMatchObject({
      month: '2026-10',
      loggedDays: 12,
      daysSoFar: 15,
      daysInMonth: 31,
      needed: 25,
      canStillCount: true,
    });
  });

  it('lists the last 7 days before today with nothing logged, newest first (UX-06)', async () => {
    await spend(oct(1));
    await spend(oct(9));
    await confirmZeroDay(oct(12));

    const logging = await getObserveLogging(TODAY);

    expect(logging.missedDays).toEqual([oct(14), oct(13), oct(11), oct(10), oct(8)]);
  });

  it('never offers days before the user began logging', async () => {
    await spend(oct(12));

    expect((await getObserveLogging(TODAY)).missedDays).toEqual([oct(14), oct(13)]);
  });

  it('offers no missed days before anything is logged', async () => {
    expect((await getObserveLogging(TODAY)).missedDays).toEqual([]);
  });

  it('names the start day when the first month began too late to count (UX-07)', async () => {
    await spend(oct(10));

    const logging = await getObserveLogging(TODAY);

    expect(logging.canStillCount).toBe(false);
    expect(logging.startedOn).toBe(10);
  });

  it('names no start day once the user has logged in an earlier month', async () => {
    await spend('2026-09-20');
    await spend(oct(10));

    expect((await getObserveLogging(TODAY)).startedOn).toBeNull();
  });
});

describe('markNoSpendDay (UX-06)', () => {
  it('marks a missed day, so it is logged and no longer missed', async () => {
    await spend(oct(10));

    await markNoSpendDay(oct(13), TODAY);

    const logging = await getObserveLogging(TODAY);
    expect(logging.loggedDays).toBe(2);
    expect(logging.missedDays).not.toContain(oct(13));
  });

  it('refuses a day outside the 7-day window', async () => {
    await expect(markNoSpendDay(oct(1), TODAY)).rejects.toThrow();
  });
});
