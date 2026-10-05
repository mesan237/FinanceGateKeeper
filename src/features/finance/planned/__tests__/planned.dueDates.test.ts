import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Real SQL engine, in-memory connection — never mock SQLite, only swap the connection.
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

import { countAttention, getDueItems } from '@/features/finance/planned/planned.dueItems';
import { markBought } from '@/features/finance/planned/planned.purchase';
import {
  createItem,
  createList,
  getLists,
  setListDueDate,
} from '@/features/finance/planned/planned.service';

let sqlite: Database.Database;
const FOOD = 1;

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

function addItem(listId: number, name: string, plannedDate: string | null = null) {
  return createItem({ listId, name, estimatedAmount: 2000, categoryId: FOOD, plannedDate });
}

describe('list due dates', () => {
  it('stores the due date a list is created with', async () => {
    await createList('Market', '2026-10-10');
    expect((await getLists())[0].dueDate).toBe('2026-10-10');
  });

  it('refuses a list without a valid due date', async () => {
    await expect(createList('Market', '')).rejects.toThrow();
    await expect(createList('Market', '10/10/2026')).rejects.toThrow();
  });

  it('moves a list to a new due date', async () => {
    const id = await createList('Market', '2026-10-10');
    await setListDueDate(id, '2026-10-17');
    expect((await getLists())[0].dueDate).toBe('2026-10-17');
  });

  it('refuses to clear or garble a due date', async () => {
    const id = await createList('Market', '2026-10-10');
    await expect(setListDueDate(id, '')).rejects.toThrow();
    await expect(setListDueDate(id, 'soon')).rejects.toThrow();
  });

  it('refuses to date a list that does not exist', async () => {
    await expect(setListDueDate(999, '2026-10-10')).rejects.toThrow();
  });

  it('reads a list made before due dates as undated', async () => {
    sqlite
      .prepare(`INSERT INTO planned_lists (name, created_at) VALUES ('Old', '2026-09-01T00:00:00Z')`)
      .run();
    expect((await getLists())[0].dueDate).toBeNull();
  });
});

describe('getDueItems', () => {
  it("dates each open item by its own date, else its list's", async () => {
    const listId = await createList('Market', '2026-10-10');
    const rice = await addItem(listId, 'Rice');
    const oil = await addItem(listId, 'Oil', '2026-10-06');

    const due = await getDueItems();

    expect(due).toEqual([
      expect.objectContaining({ id: oil, listId, listName: 'Market', dueDate: '2026-10-06' }),
      expect.objectContaining({ id: rice, listId, listName: 'Market', dueDate: '2026-10-10' }),
    ]);
  });

  it('leaves out bought items and undated items on old lists', async () => {
    const listId = await createList('Market', '2026-10-10');
    const rice = await addItem(listId, 'Rice');
    await markBought(rice, { amount: 2000, accountId: null, date: '2026-10-04' });
    sqlite
      .prepare(`INSERT INTO planned_lists (name, created_at) VALUES ('Old', '2026-09-01T00:00:00Z')`)
      .run();
    await addItem(2, 'Soap');

    expect(await getDueItems()).toEqual([]);
  });

  it('carries the name and estimate for the reminder text', async () => {
    const listId = await createList('Market', '2026-10-10');
    await addItem(listId, 'Rice');
    expect((await getDueItems())[0]).toMatchObject({ name: 'Rice', estimatedAmount: 2000 });
  });
});

describe('countAttention', () => {
  const item = (dueDate: string) => ({
    id: 1,
    listId: 1,
    listName: 'Market',
    name: 'Rice',
    estimatedAmount: 2000,
    dueDate,
  });

  it('counts due soon (today included) and overdue apart, and ignores later items', () => {
    const counts = countAttention(
      [item('2026-10-01'), item('2026-10-04'), item('2026-10-06'), item('2026-10-20')],
      '2026-10-04',
    );
    expect(counts).toEqual({ dueSoon: 2, overdue: 1 });
  });
});
