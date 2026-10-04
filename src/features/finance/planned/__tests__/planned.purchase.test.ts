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

import { markBought, unmarkBought } from '@/features/finance/planned/planned.purchase';
import { createItem, createList, getItems } from '@/features/finance/planned/planned.service';

let sqlite: Database.Database;

const FOOD = 1;
const CASH = 1;
const MOMO = 2;

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

interface ExpenseRow {
  id: number;
  amount: number;
  category_id: number;
  note: string | null;
  date: string;
  account_id: number | null;
}

function allExpenses(): ExpenseRow[] {
  return sqlite
    .prepare('SELECT id, amount, category_id, note, date, account_id FROM expenses')
    .all() as ExpenseRow[];
}

/**
 * Asserts that `promise` rejects. Used where the failure is a native SQLite
 * error: Jest's `rejects.toThrow()` does not reliably recognise those as
 * `Error`s (they come from outside its realm), which makes it flaky under load.
 */
async function expectRejection(promise: Promise<unknown>): Promise<void> {
  let rejected = false;
  try {
    await promise;
  } catch {
    rejected = true;
  }
  expect(rejected).toBe(true);
}

/** A list holding one 5 000 FCFA rice item; returns the item's id and its list id. */
async function seedRice(): Promise<{ itemId: number; listId: number }> {
  const listId = await createList('Market', '2026-10-10');
  const itemId = await createItem({
    listId,
    name: 'Rice',
    estimatedAmount: 5000,
    categoryId: FOOD,
    accountId: CASH,
  });
  return { itemId, listId };
}

describe('markBought', () => {
  it('creates one expense with the confirmed amount, category, account and date', async () => {
    const { itemId } = await seedRice();

    const expenseId = await markBought(itemId, {
      amount: 4800,
      accountId: MOMO,
      date: '2026-10-03',
    });

    expect(allExpenses()).toEqual([
      {
        id: expenseId,
        amount: 4800,
        category_id: FOOD,
        note: 'Rice',
        date: '2026-10-03',
        account_id: MOMO,
      },
    ]);
  });

  it('links the item to the expense and keeps the price actually paid', async () => {
    const { itemId, listId } = await seedRice();

    const expenseId = await markBought(itemId, {
      amount: 4800,
      accountId: CASH,
      date: '2026-10-03',
    });

    const [item] = await getItems(listId);
    expect(item).toMatchObject({
      isBought: true,
      expenseId,
      boughtAmount: 4800,
      estimatedAmount: 5000,
    });
  });

  it('refuses to buy the same item twice', async () => {
    const { itemId } = await seedRice();
    await markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });

    await expect(
      markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' }),
    ).rejects.toThrow();
    expect(allExpenses()).toHaveLength(1);
  });

  it('rejects an item that does not exist', async () => {
    await expect(
      markBought(999, { amount: 4800, accountId: CASH, date: '2026-10-03' }),
    ).rejects.toThrow();
  });

  it('rejects a zero amount and leaves the item planned', async () => {
    const { itemId, listId } = await seedRice();

    await expect(
      markBought(itemId, { amount: 0, accountId: CASH, date: '2026-10-03' }),
    ).rejects.toThrow();

    expect(allExpenses()).toHaveLength(0);
    expect((await getItems(listId))[0].isBought).toBe(false);
  });

  it('rolls the expense back when linking the item fails', async () => {
    const { itemId, listId } = await seedRice();
    sqlite.exec(
      `CREATE TRIGGER fail_link BEFORE UPDATE ON planned_items
       BEGIN SELECT RAISE(ABORT, 'link failed'); END`,
    );

    await expectRejection(
      markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' }),
    );

    expect(allExpenses()).toHaveLength(0);
    expect((await getItems(listId))[0].isBought).toBe(false);
  });

  it('records only one expense when the same item is ticked twice at once', async () => {
    const { itemId, listId } = await seedRice();
    const details = { amount: 4800, accountId: CASH, date: '2026-10-03' };

    const results = await Promise.allSettled([
      markBought(itemId, details),
      markBought(itemId, details),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    // A clean "already bought" refusal, not a raw SQLite "transaction within a transaction".
    expect((rejected[0].reason as Error).message).toBe('This item is already bought.');
    expect(allExpenses()).toHaveLength(1);
    expect((await getItems(listId))[0].expenseId).toBe(allExpenses()[0].id);
  });

  it('changes nothing in the expenses table until an item is bought', async () => {
    const { itemId } = await seedRice();
    expect(allExpenses()).toHaveLength(0);

    await markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });

    expect(allExpenses()).toHaveLength(1);
  });
});

describe('unmarkBought', () => {
  it('deletes the expense and reopens the item', async () => {
    const { itemId, listId } = await seedRice();
    await markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });

    await unmarkBought(itemId);

    expect(allExpenses()).toHaveLength(0);
    expect((await getItems(listId))[0]).toMatchObject({
      isBought: false,
      expenseId: null,
      boughtAmount: null,
    });
  });

  it('lets an item be bought again after it was unmarked', async () => {
    const { itemId, listId } = await seedRice();
    await markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });
    await unmarkBought(itemId);

    await markBought(itemId, { amount: 5200, accountId: CASH, date: '2026-10-04' });

    expect(allExpenses()).toHaveLength(1);
    expect((await getItems(listId))[0].boughtAmount).toBe(5200);
  });

  it('rejects an item that is not bought', async () => {
    const { itemId } = await seedRice();

    await expect(unmarkBought(itemId)).rejects.toThrow();
  });

  it('rejects an item that does not exist', async () => {
    await expect(unmarkBought(999)).rejects.toThrow();
  });

  it('keeps the expense when reopening the item fails', async () => {
    const { itemId, listId } = await seedRice();
    await markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });
    sqlite.exec(
      `CREATE TRIGGER fail_reopen BEFORE UPDATE ON planned_items
       BEGIN SELECT RAISE(ABORT, 'reopen failed'); END`,
    );

    await expectRejection(unmarkBought(itemId));

    expect(allExpenses()).toHaveLength(1);
    expect((await getItems(listId))[0].isBought).toBe(true);
  });
});

describe('undoing twice at once', () => {
  it('deletes the expense once and rejects the second attempt', async () => {
    const { itemId } = await seedRice();
    await markBought(itemId, { amount: 4800, accountId: CASH, date: '2026-10-03' });

    const results = await Promise.allSettled([unmarkBought(itemId), unmarkBought(itemId)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as Error).message).toBe('This item has not been bought.');
    expect(allExpenses()).toHaveLength(0);
  });
});

describe('an item whose expense changes elsewhere', () => {
  it('reopens when the expense is deleted', async () => {
    const { itemId, listId } = await seedRice();
    const expenseId = await markBought(itemId, {
      amount: 4800,
      accountId: CASH,
      date: '2026-10-03',
    });

    sqlite.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);

    expect((await getItems(listId))[0]).toMatchObject({ isBought: false, expenseId: null });
  });

  it('reads as planned even when the link was left dangling', async () => {
    const { itemId, listId } = await seedRice();
    const expenseId = await markBought(itemId, {
      amount: 4800,
      accountId: CASH,
      date: '2026-10-03',
    });

    // A connection that does not enforce foreign keys leaves the link behind.
    sqlite.pragma('foreign_keys = OFF');
    sqlite.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);

    expect((await getItems(listId))[0]).toMatchObject({ isBought: false, expenseId: null });
  });

  it('follows an edit to the expense amount', async () => {
    const { itemId, listId } = await seedRice();
    const expenseId = await markBought(itemId, {
      amount: 4800,
      accountId: CASH,
      date: '2026-10-03',
    });

    sqlite.prepare('UPDATE expenses SET amount = 4500 WHERE id = ?').run(expenseId);

    expect((await getItems(listId))[0].boughtAmount).toBe(4500);
  });
});
