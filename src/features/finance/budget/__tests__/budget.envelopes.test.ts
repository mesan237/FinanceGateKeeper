import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Real SQL engine, in-memory connection — the slice's testing standard: never
// mock SQLite, only swap the connection.
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
  copyBudgetsFromMonth,
  getCarriedIn,
  getCategoryBudgets,
  getSpendByCategory,
  getTotalBudget,
  moveBudget,
  removeCategoryBudget,
  setCategoryBudget,
  setTotalBudget,
} from '@/features/finance/budget/budget.envelopes';
import { getOrCreateCurrentAllocation } from '@/features/finance/budget/budget.service';
import { createExpense } from '@/features/finance/expenses/expenses.service';

let sqlite: Database.Database;

/** Ids of the seeded parent categories, in seed order (Food, Transport, …). */
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

describe('setCategoryBudget', () => {
  it('creates an envelope for the month', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);

    const budgets = await getCategoryBudgets('2026-08');
    expect(budgets).toHaveLength(1);
    expect(budgets[0]).toMatchObject({
      month: '2026-08',
      categoryId: FOOD,
      allocatedAmount: 60_000,
      rolloverEnabled: false,
    });
  });

  it('overwrites rather than stacking when edited mid-month', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await setCategoryBudget('2026-08', FOOD, 75_000);

    const budgets = await getCategoryBudgets('2026-08');
    expect(budgets).toHaveLength(1);
    expect(budgets[0].allocatedAmount).toBe(75_000);
  });

  it('preserves the rollover flag when the amount alone is edited', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000, true);
    await setCategoryBudget('2026-08', FOOD, 70_000);

    expect((await getCategoryBudgets('2026-08'))[0].rolloverEnabled).toBe(true);
  });

  it('allows a zero envelope', async () => {
    await setCategoryBudget('2026-08', FOOD, 0);
    expect((await getCategoryBudgets('2026-08'))[0].allocatedAmount).toBe(0);
  });

  it('rejects a negative amount', async () => {
    await expect(setCategoryBudget('2026-08', FOOD, -1)).rejects.toThrow(/whole number/i);
  });

  it('rejects a fractional amount — FCFA has no decimals', async () => {
    await expect(setCategoryBudget('2026-08', FOOD, 1_000.5)).rejects.toThrow(/whole number/i);
  });

  it('keeps months independent', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await setCategoryBudget('2026-09', FOOD, 80_000);

    expect((await getCategoryBudgets('2026-08'))[0].allocatedAmount).toBe(60_000);
    expect((await getCategoryBudgets('2026-09'))[0].allocatedAmount).toBe(80_000);
  });
});

describe('removeCategoryBudget', () => {
  it('deletes the envelope', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await removeCategoryBudget('2026-08', FOOD);

    expect(await getCategoryBudgets('2026-08')).toHaveLength(0);
  });

  it('is a no-op when no envelope exists', async () => {
    await expect(removeCategoryBudget('2026-08', FOOD)).resolves.toBeUndefined();
  });
});

describe('moveBudget', () => {
  it('conserves the month total when covering an overspend', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await setCategoryBudget('2026-08', TRANSPORT, 20_000);

    await moveBudget('2026-08', FOOD, TRANSPORT, 5_000);

    const byId = new Map((await getCategoryBudgets('2026-08')).map((b) => [b.categoryId, b]));
    expect(byId.get(FOOD)!.allocatedAmount).toBe(55_000);
    expect(byId.get(TRANSPORT)!.allocatedAmount).toBe(25_000);
  });

  it('creates the destination envelope when it does not exist yet', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);

    await moveBudget('2026-08', FOOD, TRANSPORT, 5_000);

    const byId = new Map((await getCategoryBudgets('2026-08')).map((b) => [b.categoryId, b]));
    expect(byId.get(TRANSPORT)!.allocatedAmount).toBe(5_000);
  });

  it('rejects moving more than the source holds', async () => {
    await setCategoryBudget('2026-08', FOOD, 4_000);
    await expect(moveBudget('2026-08', FOOD, TRANSPORT, 5_000)).rejects.toThrow(/enough budget/i);
  });

  it('rejects moving a category onto itself', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await expect(moveBudget('2026-08', FOOD, FOOD, 1_000)).rejects.toThrow(/different category/i);
  });

  it('rejects a non-positive amount', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await expect(moveBudget('2026-08', FOOD, TRANSPORT, 0)).rejects.toThrow(/above zero/i);
  });
});

describe('setTotalBudget / getTotalBudget', () => {
  it('is null before the user sets one, so the derived total applies', async () => {
    await getOrCreateCurrentAllocation('2026-08');
    expect(await getTotalBudget('2026-08')).toBeNull();
  });

  it('persists an explicit total', async () => {
    await getOrCreateCurrentAllocation('2026-08');
    await setTotalBudget('2026-08', 250_000);

    expect(await getTotalBudget('2026-08')).toBe(250_000);
  });

  it('clears back to the derived total', async () => {
    await getOrCreateCurrentAllocation('2026-08');
    await setTotalBudget('2026-08', 250_000);
    await setTotalBudget('2026-08', null);

    expect(await getTotalBudget('2026-08')).toBeNull();
  });

  it('rejects a negative total', async () => {
    await getOrCreateCurrentAllocation('2026-08');
    await expect(setTotalBudget('2026-08', -5)).rejects.toThrow(/whole number/i);
  });
});

describe('getSpendByCategory', () => {
  it('sums the month by category', async () => {
    await createExpense({
      amount: 12_000,
      categoryId: FOOD,
      subcategoryId: null,
      note: null,
      date: '2026-08-03',
      isRecurring: false,
    });
    await createExpense({
      amount: 8_000,
      categoryId: FOOD,
      subcategoryId: null,
      note: null,
      date: '2026-08-11',
      isRecurring: false,
    });
    await createExpense({
      amount: 3_000,
      categoryId: TRANSPORT,
      subcategoryId: null,
      note: null,
      date: '2026-08-11',
      isRecurring: false,
    });

    const spend = await getSpendByCategory('2026-08');
    expect(spend.get(FOOD)).toBe(20_000);
    expect(spend.get(TRANSPORT)).toBe(3_000);
  });

  it('excludes other months', async () => {
    await createExpense({
      amount: 12_000,
      categoryId: FOOD,
      subcategoryId: null,
      note: null,
      date: '2026-07-30',
      isRecurring: false,
    });

    expect((await getSpendByCategory('2026-08')).get(FOOD)).toBeUndefined();
  });
});

describe('getCarriedIn', () => {
  async function spend(month: string, day: string, amount: number, categoryId = FOOD) {
    await createExpense({
      amount,
      categoryId,
      subcategoryId: null,
      note: null,
      date: `${month}-${day}`,
      isRecurring: false,
    });
  }

  it('is empty when no envelope has rollover enabled', async () => {
    await setCategoryBudget('2026-08', FOOD, 60_000, false);
    expect((await getCarriedIn('2026-08')).size).toBe(0);
  });

  it('carries an unspent remainder into the next month', async () => {
    await setCategoryBudget('2026-07', FOOD, 40_000, true);
    await spend('2026-07', '10', 30_000);
    await setCategoryBudget('2026-08', FOOD, 40_000, true);

    expect((await getCarriedIn('2026-08')).get(FOOD)).toBe(10_000);
  });

  it('carries an overspend forward as a negative balance', async () => {
    await setCategoryBudget('2026-07', FOOD, 40_000, true);
    await spend('2026-07', '10', 52_000);
    await setCategoryBudget('2026-08', FOOD, 40_000, true);

    expect((await getCarriedIn('2026-08')).get(FOOD)).toBe(-12_000);
  });

  it('accumulates across several months', async () => {
    await setCategoryBudget('2026-06', FOOD, 40_000, true);
    await spend('2026-06', '10', 30_000);
    await setCategoryBudget('2026-07', FOOD, 40_000, true);
    await spend('2026-07', '10', 35_000);
    await setCategoryBudget('2026-08', FOOD, 40_000, true);

    expect((await getCarriedIn('2026-08')).get(FOOD)).toBe(15_000);
  });

  it('resets the chain when rollover is switched off for a month', async () => {
    await setCategoryBudget('2026-06', FOOD, 40_000, true);
    await spend('2026-06', '10', 10_000);
    await setCategoryBudget('2026-07', FOOD, 40_000, false);
    await setCategoryBudget('2026-08', FOOD, 40_000, true);

    // August inherits July's own untouched 40,000 — June's surplus was dropped.
    expect((await getCarriedIn('2026-08')).get(FOOD)).toBe(40_000);
  });

  it('reflects a corrected past month rather than a stale stored balance', async () => {
    await setCategoryBudget('2026-07', FOOD, 40_000, true);
    await spend('2026-07', '10', 30_000);
    await setCategoryBudget('2026-08', FOOD, 40_000, true);
    expect((await getCarriedIn('2026-08')).get(FOOD)).toBe(10_000);

    // Go back and raise July's envelope; August's carry must follow.
    await setCategoryBudget('2026-07', FOOD, 50_000);
    expect((await getCarriedIn('2026-08')).get(FOOD)).toBe(20_000);
  });
});

describe('copyBudgetsFromMonth', () => {
  it('copies every envelope, flags included', async () => {
    await setCategoryBudget('2026-07', FOOD, 60_000, true);
    await setCategoryBudget('2026-07', TRANSPORT, 20_000, false);

    const copied = await copyBudgetsFromMonth('2026-07', '2026-08');

    expect(copied).toBe(2);
    const byId = new Map((await getCategoryBudgets('2026-08')).map((b) => [b.categoryId, b]));
    expect(byId.get(FOOD)).toMatchObject({ allocatedAmount: 60_000, rolloverEnabled: true });
    expect(byId.get(TRANSPORT)).toMatchObject({ allocatedAmount: 20_000, rolloverEnabled: false });
  });

  it('overwrites envelopes already present in the destination month', async () => {
    await setCategoryBudget('2026-07', FOOD, 60_000);
    await setCategoryBudget('2026-08', FOOD, 10_000);

    await copyBudgetsFromMonth('2026-07', '2026-08');

    expect((await getCategoryBudgets('2026-08'))[0].allocatedAmount).toBe(60_000);
  });

  it('copies nothing from an empty month', async () => {
    expect(await copyBudgetsFromMonth('2026-07', '2026-08')).toBe(0);
  });
});
