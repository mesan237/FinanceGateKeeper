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

import { getAccountBalance } from '@/features/finance/accounts/accounts.balance';
import { getSpendByCategory } from '@/features/finance/budget/budget.envelopes';
import { getExpensesMonthlyTotal } from '@/features/finance/budget/budget.service';
import {
  getRefunds,
  recordRefund,
  removeRefund,
} from '@/features/finance/expenses/expenses.refunds';
import {
  createExpense,
  deleteExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
} from '@/features/finance/expenses/expenses.service';

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

/** Seeded: category 1 Food (subcategory 3 Restaurant); wallets 1 Cash, 2 MTN MoMo. */
const FOOD = 1;
const RESTAURANT = 3;
const MOMO = 2;

async function buyShoes(amount = 20_000) {
  return createExpense({
    amount,
    categoryId: FOOD,
    subcategoryId: RESTAURANT,
    note: 'Shoes',
    date: '2026-10-01',
    isRecurring: false,
    accountId: MOMO,
  });
}

describe('recordRefund (VS-45)', () => {
  it('records the refund against its purchase, in the purchase category', async () => {
    const id = await buyShoes();

    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03', note: 'Returned one pair' });

    expect(await getRefunds(id)).toEqual([
      expect.objectContaining({ amount: 5_000, accountId: MOMO, date: '2026-11-03', note: 'Returned one pair' }),
    ]);
    const refundRow = (await getAllExpenses()).find((e) => e.refundOf === id);
    expect(refundRow).toMatchObject({ amount: -5_000, categoryId: FOOD, subcategoryId: RESTAURANT });
  });

  it('lowers spending in the month the money comes back, not the month of the purchase', async () => {
    const id = await buyShoes();

    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });

    expect(await getExpensesMonthlyTotal('2026-10')).toBe(20_000);
    expect(await getExpensesMonthlyTotal('2026-11')).toBe(-5_000);
    expect((await getSpendByCategory('2026-11')).get(FOOD)).toBe(-5_000);
  });

  it('credits the account the refund lands in', async () => {
    const id = await buyShoes();

    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });

    expect(await getAccountBalance(MOMO)).toBe(-15_000);
  });

  it('refuses to refund more than is left to refund, nothing, or a bad date', async () => {
    const id = await buyShoes();
    await recordRefund(id, { amount: 15_000, accountId: MOMO, date: '2026-11-03' });

    await expect(recordRefund(id, { amount: 6_000, accountId: MOMO, date: '2026-11-04' })).rejects.toThrow();
    await expect(recordRefund(id, { amount: 0, accountId: MOMO, date: '2026-11-04' })).rejects.toThrow();
    await expect(recordRefund(id, { amount: 1_000, accountId: MOMO, date: '4/11/2026' })).rejects.toThrow();
  });

  it('refuses to refund a refund, or an expense that does not exist', async () => {
    const id = await buyShoes();
    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });
    const refundRow = (await getAllExpenses()).find((e) => e.refundOf === id)!;

    await expect(recordRefund(refundRow.id, { amount: 1_000, accountId: null, date: '2026-11-04' })).rejects.toThrow();
    await expect(recordRefund(999, { amount: 1_000, accountId: null, date: '2026-11-04' })).rejects.toThrow();
  });
});

describe('removeRefund', () => {
  it('takes the refund back out of spending and the account', async () => {
    const id = await buyShoes();
    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });
    const [refund] = await getRefunds(id);

    await removeRefund(refund.id);

    expect(await getRefunds(id)).toEqual([]);
    expect(await getExpensesMonthlyTotal('2026-11')).toBe(0);
    expect(await getAccountBalance(MOMO)).toBe(-20_000);
  });
});

describe('purchases that have refunds', () => {
  it('take their refunds with them when deleted', async () => {
    const id = await buyShoes();
    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });

    await deleteExpense(id);

    expect(await getAllExpenses()).toEqual([]);
  });

  it('cannot be edited below what has already been refunded', async () => {
    const id = await buyShoes();
    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });

    await expect(updateExpense(id, { amount: 4_000 })).rejects.toThrow();
    await updateExpense(id, { amount: 18_000 });
    expect((await getExpenseById(id))?.amount).toBe(18_000);
  });

  it('do not let a refund row be edited as if it were a purchase', async () => {
    const id = await buyShoes();
    await recordRefund(id, { amount: 5_000, accountId: MOMO, date: '2026-11-03' });
    const refundRow = (await getAllExpenses()).find((e) => e.refundOf === id)!;

    await expect(updateExpense(refundRow.id, { note: 'x' })).rejects.toThrow();
  });
});
