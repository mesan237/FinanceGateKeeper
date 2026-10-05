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

import {
  createItem,
  createList,
  deleteItem,
  deleteList,
  getItems,
  getLists,
  renameList,
  updateItem,
} from '@/features/finance/planned/planned.service';

let sqlite: Database.Database;

/** Ids of seeded parent categories, in seed order. */
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

/** Adds an item with sensible defaults to `listId`. */
function addRice(listId: number, extra: Partial<Parameters<typeof createItem>[0]> = {}) {
  return createItem({ listId, name: 'Rice', estimatedAmount: 5000, categoryId: FOOD, ...extra });
}

describe('lists', () => {
  it('creates a list that starts with no items', async () => {
    const id = await createList('Saturday market', '2026-10-10');

    const lists = await getLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({
      id,
      name: 'Saturday market',
      itemCount: 0,
      openCount: 0,
      openEstimate: 0,
    });
  });

  it('trims the name and rejects a blank one', async () => {
    await createList('  Market  ', '2026-10-10');
    expect((await getLists())[0].name).toBe('Market');

    await expect(createList('   ', '2026-10-10')).rejects.toThrow();
  });

  it('renames a list', async () => {
    const id = await createList('Market', '2026-10-10');
    await renameList(id, 'Back to school');

    expect((await getLists())[0].name).toBe('Back to school');
  });

  it('rejects renaming a list that does not exist', async () => {
    await expect(renameList(999, 'Nope')).rejects.toThrow();
  });

  it('summarises the open items of each list', async () => {
    const id = await createList('Market', '2026-10-10');
    await addRice(id);
    await createItem({ listId: id, name: 'Oil', estimatedAmount: 2500, categoryId: FOOD });

    expect((await getLists())[0]).toMatchObject({
      itemCount: 2,
      openCount: 2,
      openEstimate: 7500,
    });
  });

  it('deletes a list together with its items', async () => {
    const id = await createList('Market', '2026-10-10');
    await addRice(id);

    await deleteList(id);

    expect(await getLists()).toHaveLength(0);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM planned_items').get()).toEqual({ n: 0 });
  });

  it('rejects deleting a list that does not exist', async () => {
    await expect(deleteList(999)).rejects.toThrow();
  });
});

describe('items', () => {
  it('creates an item that starts out planned', async () => {
    const listId = await createList('Market', '2026-10-10');
    const id = await addRice(listId, { plannedDate: '2026-10-03', accountId: 1 });

    const [item] = await getItems(listId);
    expect(item).toMatchObject({
      id,
      listId,
      name: 'Rice',
      estimatedAmount: 5000,
      categoryId: FOOD,
      plannedDate: '2026-10-03',
      accountId: 1,
      expenseId: null,
      isBought: false,
      boughtAmount: null,
    });
  });

  it('leaves the date and account empty when they are not given', async () => {
    const listId = await createList('Market', '2026-10-10');
    await addRice(listId);

    const [item] = await getItems(listId);
    expect(item.plannedDate).toBeNull();
    expect(item.accountId).toBeNull();
  });

  it('rejects an estimate that is zero, negative or fractional', async () => {
    const listId = await createList('Market', '2026-10-10');

    await expect(addRice(listId, { estimatedAmount: 0 })).rejects.toThrow();
    await expect(addRice(listId, { estimatedAmount: -5 })).rejects.toThrow();
    await expect(addRice(listId, { estimatedAmount: 12.5 })).rejects.toThrow();
  });

  it('rejects an item without a name', async () => {
    const listId = await createList('Market', '2026-10-10');

    await expect(addRice(listId, { name: ' ' })).rejects.toThrow();
  });

  it('rejects an item for a list that does not exist', async () => {
    await expect(addRice(999)).rejects.toThrow();
  });

  it('rejects a malformed planned date', async () => {
    const listId = await createList('Market', '2026-10-10');

    await expect(addRice(listId, { plannedDate: '03/10/2026' })).rejects.toThrow();
  });

  it('returns items in the order they were added', async () => {
    const listId = await createList('Market', '2026-10-10');
    await addRice(listId);
    await createItem({ listId, name: 'Taxi', estimatedAmount: 1000, categoryId: TRANSPORT });

    expect((await getItems(listId)).map((i) => i.name)).toEqual(['Rice', 'Taxi']);
  });

  it('only returns the items of the requested list', async () => {
    const a = await createList('A', '2026-10-10');
    const b = await createList('B', '2026-10-10');
    await addRice(a);
    await createItem({ listId: b, name: 'Taxi', estimatedAmount: 1000, categoryId: TRANSPORT });

    expect((await getItems(b)).map((i) => i.name)).toEqual(['Taxi']);
  });

  it('updates only the fields that are passed', async () => {
    const listId = await createList('Market', '2026-10-10');
    const id = await addRice(listId, { plannedDate: '2026-10-03' });

    await updateItem(id, { estimatedAmount: 5500 });

    const [item] = await getItems(listId);
    expect(item).toMatchObject({
      name: 'Rice',
      estimatedAmount: 5500,
      plannedDate: '2026-10-03',
    });
  });

  it('clears the planned date when it is set to null', async () => {
    const listId = await createList('Market', '2026-10-10');
    const id = await addRice(listId, { plannedDate: '2026-10-03' });

    await updateItem(id, { plannedDate: null });

    expect((await getItems(listId))[0].plannedDate).toBeNull();
  });

  it('applies the same validation when updating', async () => {
    const listId = await createList('Market', '2026-10-10');
    const id = await addRice(listId);

    await expect(updateItem(id, { estimatedAmount: 0 })).rejects.toThrow();
    await expect(updateItem(id, { name: '' })).rejects.toThrow();
  });

  it('rejects updating an item that does not exist', async () => {
    await expect(updateItem(999, { name: 'Rice' })).rejects.toThrow();
  });

  it('deletes an item', async () => {
    const listId = await createList('Market', '2026-10-10');
    const id = await addRice(listId);

    await deleteItem(id);

    expect(await getItems(listId)).toHaveLength(0);
  });

  it('rejects deleting an item that does not exist', async () => {
    await expect(deleteItem(999)).rejects.toThrow();
  });
});
