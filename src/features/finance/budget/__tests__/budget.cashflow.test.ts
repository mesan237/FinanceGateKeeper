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
import {
  addSurplusToBudget,
  getExpectedIncome,
  leaveSurplusUnbudgeted,
} from '@/features/finance/budget/budget.cashflow';
import { setTotalBudget } from '@/features/finance/budget/budget.envelopes';
import {
  buildMonthlyPlan,
  checkOverBudget,
  getBudgetOverview,
} from '@/features/finance/budget/budget.plan';
import { ensureMonthRow } from '@/features/finance/budget/budget.service';
import { createIncome } from '@/features/finance/income/income.service';

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

/** Records a typical-income estimate as if the user typed it at `at`. */
async function estimate(value: number, at: string): Promise<void> {
  await execute(
    "INSERT INTO baseline_facts (kind, value, source, created_at) VALUES ('monthly_income', ?, 'user', ?)",
    [value, at],
  );
}

async function receive(date: string, amount: number): Promise<void> {
  await createIncome({ amount, sourceId: 1, note: null, date });
}

describe('getExpectedIncome', () => {
  it('is null when the user has given no income estimate', async () => {
    expect(await getExpectedIncome('2026-10')).toBeNull();
  });

  it('uses the latest estimate made before the month ended', async () => {
    await estimate(200_000, '2026-09-02T08:00:00Z');
    await estimate(250_000, '2026-10-05T08:00:00Z');

    expect(await getExpectedIncome('2026-10')).toBe(250_000);
    expect(await getExpectedIncome('2026-11')).toBe(250_000);
  });

  it('leaves a month that ended before the estimate untouched', async () => {
    await estimate(250_000, '2026-10-05T08:00:00Z');

    expect(await getExpectedIncome('2026-09')).toBeNull();
  });

  it('treats a zero estimate as no estimate', async () => {
    await estimate(250_000, '2026-10-05T08:00:00Z');
    await estimate(0, '2026-10-06T08:00:00Z');

    expect(await getExpectedIncome('2026-10')).toBeNull();
  });
});

describe('buildMonthlyPlan with expected income', () => {
  it('plans on expected income before payday', async () => {
    await estimate(250_000, '2026-10-01T08:00:00Z');

    const plan = await buildMonthlyPlan('2026-10', 0);

    expect(plan.totalBudget).toBe(250_000);
    expect(plan.derivedSource).toBe('expected');
    expect(plan.expectedIncome).toBe(250_000);
    expect(plan.receivedIncome).toBe(0);
    expect(plan.unbudgetedIncome).toBe(0);
  });

  it('follows income received when there is no estimate', async () => {
    await receive('2026-10-03', 180_000);

    const plan = await buildMonthlyPlan('2026-10', 180_000);

    expect(plan.totalBudget).toBe(180_000);
    expect(plan.derivedSource).toBe('received');
    expect(plan.expectedIncome).toBeNull();
    expect(plan.surplusNeedsJob).toBe(false);
  });

  it('does not raise the budget when income beyond the estimate arrives', async () => {
    await estimate(250_000, '2026-10-01T08:00:00Z');

    const plan = await buildMonthlyPlan('2026-10', 290_000);

    expect(plan.totalBudget).toBe(250_000);
    expect(plan.unbudgetedIncome).toBe(40_000);
    expect(plan.surplusNeedsJob).toBe(true);
  });

  it('measures the surplus against an explicit total', async () => {
    await estimate(250_000, '2026-10-01T08:00:00Z');
    await ensureMonthRow('2026-10');
    await setTotalBudget('2026-10', 200_000);

    const plan = await buildMonthlyPlan('2026-10', 250_000);

    expect(plan.totalBudget).toBe(200_000);
    expect(plan.unbudgetedIncome).toBe(50_000);
  });
});

describe('giving the surplus a job', () => {
  beforeEach(async () => {
    await estimate(250_000, '2026-10-01T08:00:00Z');
  });

  it('adds the surplus to the month as an explicit total', async () => {
    await addSurplusToBudget(await buildMonthlyPlan('2026-10', 290_000));

    const plan = await buildMonthlyPlan('2026-10', 290_000);
    expect(plan.isExplicit).toBe(true);
    expect(plan.totalBudget).toBe(290_000);
    expect(plan.surplusNeedsJob).toBe(false);
  });

  it('stops asking once the surplus is left unbudgeted', async () => {
    await leaveSurplusUnbudgeted('2026-10', 40_000);

    const plan = await buildMonthlyPlan('2026-10', 290_000);
    expect(plan.totalBudget).toBe(250_000);
    expect(plan.unbudgetedIncome).toBe(40_000);
    expect(plan.surplusNeedsJob).toBe(false);
  });

  it('asks again when more income arrives after the surplus was left', async () => {
    await leaveSurplusUnbudgeted('2026-10', 40_000);

    const plan = await buildMonthlyPlan('2026-10', 310_000);
    expect(plan.surplusNeedsJob).toBe(true);
  });
});

describe('the expected-income plan downstream', () => {
  beforeEach(async () => {
    await estimate(250_000, '2026-10-01T08:00:00Z');
  });

  it('guards spending against expected income before any income lands', async () => {
    const check = await checkOverBudget('2026-10', 260_000);

    expect(check.expenseBudget).toBe(250_000);
    expect(check.isOver).toBe(true);
    expect(check.overage).toBe(10_000);
  });

  it('treats a month planned on expected income as planned', async () => {
    const overview = await getBudgetOverview('2026-10', '2026-10-04');

    expect(overview.isUnplanned).toBe(false);
    expect(overview.available).toBe(250_000);
  });
});
