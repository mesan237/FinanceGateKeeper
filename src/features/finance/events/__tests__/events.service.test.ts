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
  createEvent,
  deleteEvent,
  getEventDetail,
  getEvents,
  updateEvent,
} from '@/features/finance/events/events.service';
import { recordRefund } from '@/features/finance/expenses/expenses.refunds';
import { createExpense, getExpenseById } from '@/features/finance/expenses/expenses.service';

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

function spend(amount: number, categoryId: number, eventId: number | null, date = '2026-11-07', note: string | null = null) {
  return createExpense({ amount, categoryId, subcategoryId: null, note, date, isRecurring: false, eventId });
}

describe('events (VS-61)', () => {
  it('creates an event with a trimmed name and an optional date', async () => {
    const wedding = await createEvent({ name: '  Marie’s wedding ', date: '2026-11-07' });
    const trip = await createEvent({ name: 'Trip to Kribi', date: null });

    const events = await getEvents();
    // An undated event sorts by the day it was created, so only the content is checked here.
    expect(events.map((e) => [e.id, e.name, e.date])).toEqual(
      expect.arrayContaining([
        [wedding, 'Marie’s wedding', '2026-11-07'],
        [trip, 'Trip to Kribi', null],
      ]),
    );
    expect(events).toHaveLength(2);
  });

  it('rejects an event without a name or with a malformed date', async () => {
    await expect(createEvent({ name: '   ', date: null })).rejects.toThrow();
    await expect(createEvent({ name: 'Wedding', date: '7/11/2026' })).rejects.toThrow();
  });

  it('totals what each event cost, refunds netted, newest event first', async () => {
    const older = await createEvent({ name: 'Funeral', date: '2026-09-12' });
    const newer = await createEvent({ name: 'Wedding', date: '2026-11-07' });
    await spend(4_000, TRANSPORT, newer);
    const gift = await spend(20_000, FOOD, newer);
    await recordRefund(gift, { amount: 5_000, accountId: null, date: '2026-11-08' });
    await spend(3_000, TRANSPORT, older, '2026-09-12');
    await spend(9_999, FOOD, null);

    const events = await getEvents();

    expect(events.map((e) => [e.id, e.total, e.count])).toEqual([
      [newer, 19_000, 2],
      [older, 3_000, 1],
    ]);
  });

  it('splits an event by category and lists its expenses, newest first', async () => {
    const wedding = await createEvent({ name: 'Wedding', date: '2026-11-07' });
    await spend(4_000, TRANSPORT, wedding, '2026-11-07', 'Taxi');
    await spend(20_000, FOOD, wedding, '2026-11-06', 'Gift basket');
    await spend(3_000, TRANSPORT, wedding, '2026-11-08');

    const detail = await getEventDetail(wedding);

    expect(detail?.total).toBe(27_000);
    expect(detail?.byCategory.map((c) => [c.categoryId, c.amount])).toEqual([
      [FOOD, 20_000],
      [TRANSPORT, 7_000],
    ]);
    expect(detail?.expenses.map((e) => [e.date, e.amount, e.note])).toEqual([
      ['2026-11-08', 3_000, null],
      ['2026-11-07', 4_000, 'Taxi'],
      ['2026-11-06', 20_000, 'Gift basket'],
    ]);
  });

  it('renames an event and changes its date', async () => {
    const id = await createEvent({ name: 'Wedding', date: null });

    await updateEvent(id, { name: 'Marie’s wedding', date: '2026-11-07' });

    expect((await getEventDetail(id))?.event).toMatchObject({ name: 'Marie’s wedding', date: '2026-11-07' });
  });

  it('deletes an event and frees its expenses, which stay as they were', async () => {
    const id = await createEvent({ name: 'Wedding', date: null });
    const taxi = await spend(4_000, TRANSPORT, id);

    await deleteEvent(id);

    expect(await getEvents()).toEqual([]);
    expect(await getEventDetail(id)).toBeNull();
    const expense = await getExpenseById(taxi);
    expect(expense).toMatchObject({ amount: 4_000, eventId: null });
  });
});
