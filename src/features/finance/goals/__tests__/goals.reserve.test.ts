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

import { execute } from '@/services/database';
import { createAccount, logTransfer } from '@/features/finance/accounts/accounts.service';
import { setCategoryCostType } from '@/features/finance/expenses/expenses.costType';
import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';
import {
  createGoal,
  getEssentialMonthly,
  getGoalById,
  getGoals,
  updateGoal,
} from '@/features/finance/goals/goals.service';
import type { NewGoal } from '@/features/finance/goals/goals.types';
import { daysInMonth } from '@/utils/monthMath';

let sqlite: Database.Database;
let wallet: number;

const TODAY = '2026-10-18';
const FIXED = 1;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  wallet = (await createAccount({ name: 'Emergency', type: 'bank', purpose: 'emergency' })).id;
  await setCategoryCostType(FIXED, 'fixed');
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

async function estimateEssentials(value: number): Promise<void> {
  await execute(
    `INSERT INTO baseline_facts (kind, value, source, created_at)
     VALUES ('monthly_essentials', ?, 'user', '2026-10-01T08:00:00Z')`,
    [value],
  );
}

/** A complete month whose fixed spending is `fixed`. */
async function observedMonth(monthISO: string, fixed: number): Promise<void> {
  for (let day = 1; day <= daysInMonth(monthISO); day += 1) {
    await confirmZeroDay(`${monthISO}-${String(day).padStart(2, '0')}`);
  }
  await createExpense({
    amount: fixed,
    categoryId: FIXED,
    subcategoryId: null,
    note: null,
    date: `${monthISO}-05`,
    isRecurring: false,
  });
}

function reserve(overrides: Partial<NewGoal> = {}): NewGoal {
  return {
    name: 'Emergency reserve',
    kind: 'reserve',
    targetAmount: 0,
    targetMonths: 3,
    accountId: wallet,
    monthlyAmount: 20_000,
    ...overrides,
  };
}

describe('getEssentialMonthly', () => {
  it('is unknown with neither logged months nor an estimate', async () => {
    expect(await getEssentialMonthly(TODAY)).toEqual({ amount: null, source: null, completeMonths: 0 });
  });

  it('falls back to the essentials estimate before any month is complete', async () => {
    await estimateEssentials(120_000);

    expect(await getEssentialMonthly(TODAY)).toEqual({ amount: 120_000, source: 'estimate', completeMonths: 0 });
  });

  it('prefers what complete months show over the estimate', async () => {
    await estimateEssentials(120_000);
    await observedMonth('2026-09', 150_000);

    expect(await getEssentialMonthly(TODAY)).toEqual({ amount: 150_000, source: 'observed', completeMonths: 1 });
  });
});

describe('emergency reserve goals (VS-50)', () => {
  it('sizes the target as months of essentials', async () => {
    await estimateEssentials(120_000);

    const id = await createGoal(reserve(), TODAY);

    expect(await getGoalById(id)).toMatchObject({ kind: 'reserve', targetMonths: 3, targetAmount: 360_000, targetDate: null });
  });

  it('refuses a reserve when there is nothing to size it from', async () => {
    await expect(createGoal(reserve(), TODAY)).rejects.toThrow();
  });

  it('requires between 1 and 12 months', async () => {
    await estimateEssentials(120_000);

    await expect(createGoal(reserve({ targetMonths: null }), TODAY)).rejects.toThrow();
    await expect(createGoal(reserve({ targetMonths: 13 }), TODAY)).rejects.toThrow();
  });

  it('drops months from a buffer', async () => {
    const id = await createGoal({ ...reserve({ kind: 'buffer', targetAmount: 100_000 }) }, TODAY);

    expect((await getGoalById(id))?.targetMonths).toBeNull();
  });

  it('follows real spending as months are logged, and says what it rests on', async () => {
    await estimateEssentials(120_000);
    await createGoal(reserve(), TODAY);
    await logTransfer(1, wallet, 90_000, '2026-10-03');
    await observedMonth('2026-09', 150_000);

    const [goal] = await getGoals(TODAY);

    expect(goal.targetAmount).toBe(450_000);
    expect(goal.reserveBasis).toEqual({ essentials: 150_000, source: 'observed', completeMonths: 1 });
    expect(goal.progress.remaining).toBe(360_000);
    expect(goal.progress.monthsToTarget).toBe(18);
  });

  it('re-sizes the target when the months change', async () => {
    await estimateEssentials(120_000);
    const id = await createGoal(reserve(), TODAY);

    await updateGoal(id, { targetMonths: 6 }, TODAY);

    expect((await getGoalById(id))?.targetAmount).toBe(720_000);
  });
});
