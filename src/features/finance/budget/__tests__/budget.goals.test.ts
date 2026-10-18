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
import { createAccount, hideAccount, logTransfer } from '@/features/finance/accounts/accounts.service';
import { getGoalCash, getGoalSetAside } from '@/features/finance/budget/budget.goals';
import { ensureMonthRow } from '@/features/finance/budget/budget.service';
import { setCategoryBudget, setTotalBudget } from '@/features/finance/budget/budget.envelopes';
import { buildMonthlyPlan, checkOverBudget, getBudgetOverview } from '@/features/finance/budget/budget.plan';

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

/** A goal in `accountId`, created at `createdAt`, optionally deleted at `deletedAt`. */
async function goal(
  accountId: number,
  monthly: number,
  createdAt = '2026-10-02T08:00:00Z',
  deletedAt: string | null = null,
): Promise<void> {
  await execute(
    `INSERT INTO goals (name, kind, target_amount, target_date, account_id, monthly_amount, created_at, deleted_at)
     VALUES ('Goal', 'buffer', 500000, NULL, ?, ?, ?, ?)`,
    [accountId, monthly, createdAt, deletedAt],
  );
}

async function wallet(name: string): Promise<number> {
  return (await createAccount({ name, type: 'mobile_money', purpose: 'saving' })).id;
}

describe('getGoalSetAside', () => {
  it('is zero without goals', async () => {
    expect(await getGoalSetAside('2026-10')).toBe(0);
  });

  it('adds the monthly amounts of the goals live during the month', async () => {
    await goal(await wallet('A'), 20_000);
    await goal(await wallet('B'), 15_000, '2026-10-20T08:00:00Z');

    expect(await getGoalSetAside('2026-10')).toBe(35_000);
  });

  it('leaves a month alone that ended before the goal started', async () => {
    await goal(await wallet('A'), 20_000, '2026-10-02T08:00:00Z');

    expect(await getGoalSetAside('2026-09')).toBe(0);
  });

  it('keeps a deleted goal in the months it was live, and only those', async () => {
    await goal(await wallet('A'), 20_000, '2026-09-02T08:00:00Z', '2026-10-15T08:00:00Z');

    expect(await getGoalSetAside('2026-09')).toBe(20_000);
    expect(await getGoalSetAside('2026-10')).toBe(20_000);
    expect(await getGoalSetAside('2026-11')).toBe(0);
  });
});

describe('getGoalCash', () => {
  it('sums the balances of the wallets that hold a live goal', async () => {
    const a = await wallet('A');
    const b = await wallet('B');
    const c = await wallet('C');
    await goal(a, 20_000);
    await goal(b, 10_000);
    await goal(c, 10_000, '2026-10-02T08:00:00Z', '2026-10-05T08:00:00Z');
    await logTransfer(1, a, 50_000, '2026-10-03');
    await logTransfer(1, b, 30_000, '2026-10-03');
    await logTransfer(1, c, 7_000, '2026-10-03');

    expect(await getGoalCash()).toBe(80_000);
  });

  it('leaves out a goal wallet that was hidden, as cash on hand does', async () => {
    const a = await wallet('A');
    await goal(a, 20_000);
    await logTransfer(1, a, 50_000, '2026-10-03');
    await hideAccount(a);

    expect(await getGoalCash()).toBe(0);
  });
});

describe('paying yourself first (VS-49)', () => {
  beforeEach(async () => {
    await goal(await wallet('A'), 30_000);
    await ensureMonthRow('2026-10');
    await setTotalBudget('2026-10', 200_000);
  });

  it('sets the goals aside before the envelopes share out the rest', async () => {
    await setCategoryBudget('2026-10', 1, 150_000, false);

    const plan = await buildMonthlyPlan('2026-10', 0);

    expect(plan.totalBudget).toBe(200_000);
    expect(plan.setAside).toBe(30_000);
    expect(plan.spendable).toBe(170_000);
    expect(plan.unassigned).toBe(20_000);
    expect(plan.isOverAllocated).toBe(false);
  });

  it('flags envelopes that promise money the goals already took', async () => {
    await setCategoryBudget('2026-10', 1, 180_000, false);

    const plan = await buildMonthlyPlan('2026-10', 0);

    expect(plan.unassigned).toBe(-10_000);
    expect(plan.isOverAllocated).toBe(true);
  });

  it('never lets the goals push spendable below zero', async () => {
    await setTotalBudget('2026-10', 20_000);

    const plan = await buildMonthlyPlan('2026-10', 0);

    expect(plan.spendable).toBe(0);
    expect(plan.setAsideShortfall).toBe(10_000);
  });

  it('still warns about spending when the goals take the whole budget', async () => {
    await setTotalBudget('2026-10', 20_000);

    const check = await checkOverBudget('2026-10', 5_000);

    expect(check.expenseBudget).toBe(0);
    expect(check.isOver).toBe(true);
  });

  it('measures spending against what is left after the goals', async () => {
    const overview = await getBudgetOverview('2026-10', '2026-10-17');
    const check = await checkOverBudget('2026-10', 180_000);

    expect(overview.available).toBe(170_000);
    expect(check.expenseBudget).toBe(170_000);
    expect(check.isOver).toBe(true);
  });

  it('measures surplus income against the whole total, goals included', async () => {
    const plan = await buildMonthlyPlan('2026-10', 230_000);

    expect(plan.unbudgetedIncome).toBe(30_000);
  });
});
