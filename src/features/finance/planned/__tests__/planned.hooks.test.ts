import { act, renderHook, waitFor } from '@testing-library/react-native';
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

import { usePlannedItems, usePlannedLists } from '@/features/finance/planned/planned.hooks';

let sqlite: Database.Database;

const FOOD = 1;
const CASH = 1;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('usePlannedLists', () => {
  it('creates a list and shows it', async () => {
    const { result } = renderHook(() => usePlannedLists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.create('Saturday market');
    });

    expect(ok).toBe(true);
    expect(result.current.lists.map((l) => l.name)).toEqual(['Saturday market']);
  });

  it('reports a validation failure instead of throwing', async () => {
    const { result } = renderHook(() => usePlannedLists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.create('  ');
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Give it a name.');
  });
});

describe('usePlannedItems', () => {
  async function setup() {
    const lists = renderHook(() => usePlannedLists());
    await waitFor(() => expect(lists.result.current.loading).toBe(false));
    await act(async () => {
      await lists.result.current.create('Market');
    });
    const listId = lists.result.current.lists[0].id;

    const items = renderHook(() => usePlannedItems(listId));
    await waitFor(() => expect(items.result.current.loading).toBe(false));
    return items;
  }

  it('adds an item and exposes the list name', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.add({ name: 'Rice', estimatedAmount: 5000, categoryId: FOOD });
    });

    expect(result.current.listName).toBe('Market');
    expect(result.current.items.map((i) => i.name)).toEqual(['Rice']);
  });

  it('buys an item into an expense and undoes it', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.add({ name: 'Rice', estimatedAmount: 5000, categoryId: FOOD });
    });
    const itemId = result.current.items[0].id;

    await act(async () => {
      await result.current.buy(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });
    });
    expect(result.current.items[0]).toMatchObject({ isBought: true, boughtAmount: 4800 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM expenses').get()).toEqual({ n: 1 });

    await act(async () => {
      await result.current.unbuy(itemId);
    });
    expect(result.current.items[0].isBought).toBe(false);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM expenses').get()).toEqual({ n: 0 });
  });

  it('reports a failed purchase and leaves the item planned', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.add({ name: 'Rice', estimatedAmount: 5000, categoryId: FOOD });
    });
    const itemId = result.current.items[0].id;

    let ok = true;
    await act(async () => {
      ok = await result.current.buy(itemId, { amount: 0, accountId: CASH, date: '2026-10-03' });
    });

    expect(ok).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.items[0].isBought).toBe(false);
  });

  it('deletes the whole list', async () => {
    const { result } = await setup();

    let ok = false;
    await act(async () => {
      ok = await result.current.removeList();
    });

    expect(ok).toBe(true);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM planned_lists').get()).toEqual({ n: 0 });
  });
});
