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

import { createEvent } from '@/features/finance/events/events.service';
import { createExpense, getAllCategories, getExpensesByDateRange } from '@/features/finance/expenses/expenses.service';
import { summariseReasons } from '@/features/finance/reports/reports.reasons';

let sqlite: Database.Database;
const FOOD = 1;
const TRANSPORT = 5;

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

function spend(amount: number, categoryId: number, extra: { isRecurring?: boolean; isUnplanned?: boolean; eventId?: number } = {}) {
  return createExpense({
    amount,
    categoryId,
    subcategoryId: null,
    note: null,
    date: '2026-08-10',
    isRecurring: extra.isRecurring ?? false,
    isUnplanned: extra.isUnplanned ?? false,
    eventId: extra.eventId ?? null,
  });
}

describe('summariseReasons — why the month went (VS-62)', () => {
  it('splits the month across categories and names its events, largest first', async () => {
    const wedding = await createEvent({ name: 'Marie’s wedding', date: '2026-08-15' });
    await spend(20_000, TRANSPORT, { isRecurring: true });
    await spend(8_000, TRANSPORT, { eventId: wedding });
    await spend(25_000, FOOD, { eventId: wedding });
    await spend(3_000, FOOD, { isUnplanned: true });
    await spend(12_000, FOOD);

    const why = await summariseReasons(
      await getExpensesByDateRange('2026-08-01', '2026-08-31'),
      await getAllCategories(),
    );

    expect(why.totals).toEqual({ routine: 20_000, event: 33_000, unexpected: 3_000, everyday: 12_000 });
    expect(why.events).toEqual([{ eventId: wedding, name: 'Marie’s wedding', amount: 33_000 }]);
  });

  it('has nothing to say about a month without spending', async () => {
    const why = await summariseReasons([], await getAllCategories());

    expect(why).toEqual({ totals: { routine: 0, event: 0, unexpected: 0, everyday: 0 }, events: [] });
  });
});
