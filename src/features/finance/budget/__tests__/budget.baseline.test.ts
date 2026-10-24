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
  getBaseline,
  getBaselineChecklist,
  countCompleteMonths,
  getBaselineFactValue,
  saveEstimates,
  setBaselineFact,
} from '@/features/finance/budget/budget.baseline';

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

const ESTIMATES = { monthlyIncome: 250_000, incomeRegular: true, payDay: 25, monthlyEssentials: 140_000 };

describe('estimates (VS-46)', () => {
  it('starts empty: nothing is assumed about the user', async () => {
    expect(await getBaseline()).toEqual({
      monthlyIncome: null,
      incomeRegular: null,
      payDay: null,
      monthlyEssentials: null,
      noDebts: false,
      costTypesReviewed: false,
      checklistHidden: false,
    });
  });

  it('saves the estimates as typed by the user, with when they were set', async () => {
    await saveEstimates(ESTIMATES);

    const baseline = await getBaseline();
    expect(baseline.monthlyIncome).toMatchObject({ value: 250_000, source: 'user' });
    expect(baseline.monthlyIncome?.setAt).toEqual(expect.any(String));
    expect(baseline.incomeRegular).toBe(true);
    expect(baseline.payDay).toBe(25);
    expect(baseline.monthlyEssentials).toMatchObject({ value: 140_000, source: 'user' });
  });

  it('keeps earlier answers: a new estimate is a new row and the latest wins', async () => {
    await saveEstimates(ESTIMATES);
    await setBaselineFact('monthly_essentials', 120_000, 'observed');

    expect((await getBaseline()).monthlyEssentials).toMatchObject({ value: 120_000, source: 'observed' });
    const rows = sqlite.prepare("SELECT COUNT(*) AS n FROM baseline_facts WHERE kind = 'monthly_essentials'").get() as { n: number };
    expect(rows.n).toBe(2);
  });

  it('does not write an unchanged answer twice', async () => {
    await saveEstimates(ESTIMATES);
    await saveEstimates(ESTIMATES);

    const rows = sqlite.prepare('SELECT COUNT(*) AS n FROM baseline_facts').get() as { n: number };
    expect(rows.n).toBe(4);
  });

  it('drops the pay day for irregular income', async () => {
    await saveEstimates({ ...ESTIMATES, incomeRegular: false, payDay: null });

    const baseline = await getBaseline();
    expect(baseline.incomeRegular).toBe(false);
    expect(baseline.payDay).toBeNull();
  });

  it('rejects a negative or fractional amount, and a pay day outside 1–31', async () => {
    await expect(saveEstimates({ ...ESTIMATES, monthlyIncome: -1 })).rejects.toThrow();
    await expect(saveEstimates({ ...ESTIMATES, monthlyEssentials: 10.5 })).rejects.toThrow();
    await expect(saveEstimates({ ...ESTIMATES, payDay: 32 })).rejects.toThrow();
  });
});

describe('getBaselineChecklist', () => {
  function done(steps: { key: string; done: boolean }[]) {
    return Object.fromEntries(steps.map((s) => [s.key, s.done]));
  }

  it('lists every step as not done on a fresh install', async () => {
    expect(done(await getBaselineChecklist())).toEqual({
      balances: false,
      bills: false,
      debts: false,
      costTypes: false,
      estimates: false,
    });
  });

  it('ticks each step off from what the user has actually set up', async () => {
    await execute(
      `INSERT INTO balance_checks (account_id, balance, difference, date, created_at)
       VALUES (1, 10000, 0, '2026-10-17', '2026-10-17T08:00:00Z')`,
    );
    await execute(
      `INSERT INTO recurring_expenses (label, amount, category_id, frequency, next_due_date, created_at)
       VALUES ('Rent', 100000, 9, 'monthly', '2026-11-01', '2026-10-17T08:00:00Z')`,
    );
    await setBaselineFact('no_debts', 1);
    await setBaselineFact('cost_types_reviewed', 1);
    await saveEstimates(ESTIMATES);

    expect(Object.values(done(await getBaselineChecklist()))).toEqual([true, true, true, true, true]);
  });

  it('counts a recorded debt as the debts step done', async () => {
    await execute(
      `INSERT INTO debts (person_name, amount, direction, date, status, created_at)
       VALUES ('Marie', 5000, 'lent', '2026-10-01', 'pending', '2026-10-01T08:00:00Z')`,
    );
    expect(done(await getBaselineChecklist()).debts).toBe(true);
  });

  it('needs both income and essentials before the estimates step is done', async () => {
    await setBaselineFact('monthly_income', 250_000);
    expect(done(await getBaselineChecklist()).estimates).toBe(false);
  });
});

describe('countCompleteMonths', () => {
  it('counts the complete months in the window before a month', async () => {
    for (let d = 1; d <= 30; d += 1) {
      await execute('INSERT INTO zero_days (date, confirmed_at) VALUES (?, ?)', [
        `2026-09-${String(d).padStart(2, '0')}`,
        '2026-09-30T00:00:00Z',
      ]);
    }
    expect(await countCompleteMonths('2026-10')).toBe(1);
    expect(await countCompleteMonths('2026-09')).toBe(0);
  });
});

describe('getBaselineFactValue (VS-63)', () => {
  it('is null for a kind never answered', async () => {
    expect(await getBaselineFactValue('journey_skipped')).toBeNull();
  });

  it('returns the latest answer for a kind', async () => {
    await setBaselineFact('journey_skipped', 3);
    await setBaselineFact('journey_skipped', 4);
    expect(await getBaselineFactValue('journey_skipped')).toBe(4);
  });

  it('keeps the journey answers out of the baseline itself', async () => {
    await setBaselineFact('picture_reviewed', 1);
    await setBaselineFact('journey_reached', 2);
    expect((await getBaseline()).checklistHidden).toBe(false);
    expect(await getBaselineFactValue('picture_reviewed')).toBe(1);
  });
});
