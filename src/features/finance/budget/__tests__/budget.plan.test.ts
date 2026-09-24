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

import { setCategoryBudget, setTotalBudget } from '@/features/finance/budget/budget.envelopes';
import {
  buildMonthlyPlan,
  checkCategoryBudget,
  getBudgetOverview,
  suggestFromHistory,
} from '@/features/finance/budget/budget.plan';
import { ensureMonthRow } from '@/features/finance/budget/budget.service';
import { createExpense } from '@/features/finance/expenses/expenses.service';
import { createIncome } from '@/features/finance/income/income.service';

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

/** Logs income — since VS-34 the month's income *is* the derived budget. */
async function logIncome(month: string, amount: number): Promise<void> {
  await createIncome({
    amount,
    source: 'salary',
    note: null,
    date: `${month}-01`,
  });
}

async function spend(
  month: string,
  day: string,
  amount: number,
  categoryId = FOOD,
): Promise<void> {
  await createExpense({
    amount,
    categoryId,
    subcategoryId: null,
    note: null,
    date: `${month}-${day}`,
    isRecurring: false,
  });
}

describe('buildMonthlyPlan', () => {
  it('falls back to the derived total when none is set', async () => {
    await ensureMonthRow('2026-08');

    const plan = await buildMonthlyPlan('2026-08', 260_000);

    expect(plan.totalBudget).toBe(260_000);
    expect(plan.isExplicit).toBe(false);
    expect(plan.derivedTotal).toBe(260_000);
  });

  it('lets an explicit total win over the derived one', async () => {
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 200_000);

    const plan = await buildMonthlyPlan('2026-08', 260_000);

    expect(plan.totalBudget).toBe(200_000);
    expect(plan.isExplicit).toBe(true);
    // The derived figure stays available so the planner can still suggest it.
    expect(plan.derivedTotal).toBe(260_000);
  });

  it('tracks how much of the total is still unassigned', async () => {
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 200_000);
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await setCategoryBudget('2026-08', TRANSPORT, 40_000);

    const plan = await buildMonthlyPlan('2026-08', 260_000);

    expect(plan.assigned).toBe(100_000);
    expect(plan.unassigned).toBe(100_000);
    expect(plan.isOverAllocated).toBe(false);
  });

  it('flags an over-allocated month with a negative unassigned figure', async () => {
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 100_000);
    await setCategoryBudget('2026-08', FOOD, 80_000);
    await setCategoryBudget('2026-08', TRANSPORT, 50_000);

    const plan = await buildMonthlyPlan('2026-08', 260_000);

    expect(plan.unassigned).toBe(-30_000);
    expect(plan.isOverAllocated).toBe(true);
  });
});

describe('getBudgetOverview', () => {
  it('marks a month with no total and no envelopes as unplanned', async () => {
    const overview = await getBudgetOverview('2026-08', '2026-08-10');
    expect(overview.isUnplanned).toBe(true);
  });

  it('is no longer unplanned once an envelope exists', async () => {
    await ensureMonthRow('2026-08');
    await setCategoryBudget('2026-08', FOOD, 60_000);

    expect((await getBudgetOverview('2026-08', '2026-08-10')).isUnplanned).toBe(false);
  });

  it('composes plan, envelopes and pace for the month', async () => {
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 300_000);
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await spend('2026-08', '05', 30_000, FOOD);

    const overview = await getBudgetOverview('2026-08', '2026-08-10');

    expect(overview.available).toBe(300_000);
    expect(overview.spent).toBe(30_000);
    expect(overview.remaining).toBe(270_000);
    expect(overview.daysElapsed).toBe(10);
    expect(overview.daysRemaining).toBe(21);

    const food = overview.categories.find((c) => c.categoryId === FOOD)!;
    expect(food.allocated).toBe(60_000);
    expect(food.spent).toBe(30_000);
    expect(food.remaining).toBe(30_000);
    expect(food.consumedPct).toBe(50);
  });

  it('surfaces unbudgeted spending as a zero-budget envelope', async () => {
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 300_000);
    await spend('2026-08', '05', 9_000, TRANSPORT);

    const overview = await getBudgetOverview('2026-08', '2026-08-10');
    const transport = overview.categories.find((c) => c.categoryId === TRANSPORT)!;

    expect(transport.allocated).toBe(0);
    expect(transport.spent).toBe(9_000);
    // Nothing budgeted means nothing to be over — the row informs, it does not scold.
    expect(transport.health).toBe('on_track');
  });

  it('omits categories with neither a budget nor spending', async () => {
    await ensureMonthRow('2026-08');
    await setCategoryBudget('2026-08', FOOD, 60_000);

    const overview = await getBudgetOverview('2026-08', '2026-08-10');

    expect(overview.categories.map((c) => c.categoryId)).toEqual([FOOD]);
  });

  it('counts unbudgeted spend in the month total, not just budgeted spend', async () => {
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 100_000);
    await setCategoryBudget('2026-08', FOOD, 60_000);
    await spend('2026-08', '05', 10_000, FOOD);
    await spend('2026-08', '06', 25_000, TRANSPORT); // no envelope

    const overview = await getBudgetOverview('2026-08', '2026-08-10');

    expect(overview.spent).toBe(35_000);
  });

  it('folds rollover carry into the month available figure', async () => {
    await ensureMonthRow('2026-07');
    await ensureMonthRow('2026-08');
    await setCategoryBudget('2026-07', FOOD, 40_000, true);
    await spend('2026-07', '10', 25_000, FOOD);
    await setTotalBudget('2026-08', 100_000);
    await setCategoryBudget('2026-08', FOOD, 40_000, true);

    const overview = await getBudgetOverview('2026-08', '2026-08-10');

    expect(overview.totalCarried).toBe(15_000);
    expect(overview.available).toBe(115_000);
  });

  it("derives the total from the month's income when none is set explicitly", async () => {
    await ensureMonthRow('2026-08');
    await logIncome('2026-08', 400_000);

    const overview = await getBudgetOverview('2026-08', '2026-08-10');

    // Before VS-34 this was income x expenses_pct; with no split the whole
    // month's income is the derived budget.
    expect(overview.plan.isExplicit).toBe(false);
    expect(overview.plan.totalBudget).toBe(400_000);
  });
});

describe('suggestFromHistory', () => {
  it('averages the months that actually had spending', async () => {
    await spend('2026-06', '10', 30_000, FOOD);
    await spend('2026-07', '10', 50_000, FOOD);

    const suggestions = await suggestFromHistory('2026-08', 3);

    // 80,000 over the two months with data — not divided by the full 3-month window.
    expect(suggestions.get(FOOD)).toBe(40_000);
  });

  it('ignores the month being planned', async () => {
    await spend('2026-08', '02', 90_000, FOOD);

    expect((await suggestFromHistory('2026-08', 3)).size).toBe(0);
  });

  it('returns nothing with no history', async () => {
    expect((await suggestFromHistory('2026-08', 3)).size).toBe(0);
  });

  it('respects the lookback window', async () => {
    await spend('2026-04', '10', 90_000, FOOD);

    // April is four months before August — outside a 3-month window.
    expect((await suggestFromHistory('2026-08', 3)).size).toBe(0);
    expect((await suggestFromHistory('2026-08', 4)).get(FOOD)).toBe(90_000);
  });
});

describe('checkCategoryBudget', () => {
  it('reports no budget for a category without an envelope', async () => {
    const check = await checkCategoryBudget('2026-08', FOOD, 50_000);

    expect(check.hasBudget).toBe(false);
    expect(check.isOver).toBe(false);
  });

  it('flags an expense that would exceed the envelope', async () => {
    await setCategoryBudget('2026-08', FOOD, 20_000);
    await spend('2026-08', '05', 17_000, FOOD);

    const check = await checkCategoryBudget('2026-08', FOOD, 8_000);

    expect(check.isOver).toBe(true);
    expect(check.overage).toBe(5_000);
    expect(check.remaining).toBe(3_000);
    expect(check.categoryName).toBe('Food');
  });

  it('does not flag an expense that fits', async () => {
    await setCategoryBudget('2026-08', FOOD, 20_000);
    await spend('2026-08', '05', 10_000, FOOD);

    expect((await checkCategoryBudget('2026-08', FOOD, 5_000)).isOver).toBe(false);
  });

  it('treats landing exactly on budget as not over', async () => {
    await setCategoryBudget('2026-08', FOOD, 20_000);
    await spend('2026-08', '05', 15_000, FOOD);

    expect((await checkCategoryBudget('2026-08', FOOD, 5_000)).isOver).toBe(false);
  });

  it('binds as soon as the envelope exists, with no month income at all', async () => {
    // An envelope is a number the user typed on purpose, so it binds
    // immediately — it never depended on the (now removed) month lock, and it
    // does not wait for income either.
    await ensureMonthRow('2026-08');
    await setCategoryBudget('2026-08', FOOD, 10_000);

    expect((await checkCategoryBudget('2026-08', FOOD, 50_000)).isOver).toBe(true);
  });

  it('counts carried-in budget as spendable headroom', async () => {
    await setCategoryBudget('2026-07', FOOD, 40_000, true);
    await spend('2026-07', '10', 20_000, FOOD);
    await setCategoryBudget('2026-08', FOOD, 10_000, true);

    // 10,000 assigned + 20,000 carried = 30,000 available.
    const check = await checkCategoryBudget('2026-08', FOOD, 25_000);

    expect(check.expenseBudget).toBe(30_000);
    expect(check.isOver).toBe(false);
  });
});
