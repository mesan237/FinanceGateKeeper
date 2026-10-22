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

import { getRefunds, recordRefund } from '@/features/finance/expenses/expenses.refunds';
import {
  createExpense,
  getExpenseById,
  updateExpense,
} from '@/features/finance/expenses/expenses.service';

let sqlite: Database.Database;
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

function event(name: string): number {
  return sqlite
    .prepare("INSERT INTO events (name, date, created_at) VALUES (?, '2026-11-07', '2026-10-22T08:00:00Z')")
    .run(name).lastInsertRowid as number;
}

function taxi(eventId?: number | null) {
  return createExpense({
    amount: 4_000,
    categoryId: TRANSPORT,
    subcategoryId: null,
    note: 'Taxi',
    date: '2026-11-07',
    isRecurring: false,
    eventId,
  });
}

describe('an expense and its event (VS-61)', () => {
  it('saves the event an expense was for', async () => {
    const wedding = event('Marie’s wedding');

    const id = await taxi(wedding);

    expect((await getExpenseById(id))?.eventId).toBe(wedding);
  });

  it('has no event unless one is given', async () => {
    const id = await taxi();

    expect((await getExpenseById(id))?.eventId).toBeNull();
  });

  it('moves an expense to another event, or off any event', async () => {
    const wedding = event('Marie’s wedding');
    const funeral = event('Uncle Paul’s funeral');
    const id = await taxi(wedding);

    await updateExpense(id, { eventId: funeral });
    expect((await getExpenseById(id))?.eventId).toBe(funeral);

    await updateExpense(id, { eventId: null });
    expect((await getExpenseById(id))?.eventId).toBeNull();
  });

  it('gives a refund the event of its purchase, and moves it with the purchase', async () => {
    const wedding = event('Marie’s wedding');
    const funeral = event('Uncle Paul’s funeral');
    const id = await taxi(wedding);
    await recordRefund(id, { amount: 1_000, accountId: null, date: '2026-11-08' });
    const [refund] = await getRefunds(id);
    expect((await getExpenseById(refund.id))?.eventId).toBe(wedding);

    await updateExpense(id, { eventId: funeral });

    expect((await getExpenseById(refund.id))?.eventId).toBe(funeral);
  });
});
