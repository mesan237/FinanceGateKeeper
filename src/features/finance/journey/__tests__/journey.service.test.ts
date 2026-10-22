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
import { setCategoryBudget, setTotalBudget } from '@/features/finance/budget/budget.envelopes';
import { ensureMonthRow } from '@/features/finance/budget/budget.service';
import { confirmZeroDay, createExpense } from '@/features/finance/expenses/expenses.service';
import {
  getJourney,
  markPictureReviewed,
  resolveJourney,
  skipToStep,
} from '@/features/finance/journey/journey.service';
import type { JourneyEvidence } from '@/features/finance/journey/journey.types';

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

const TODAY = '2026-10-15';
const FOOD = 1;

async function spend(date: string, amount: number): Promise<void> {
  await createExpense({ amount, categoryId: FOOD, subcategoryId: null, note: null, date, isRecurring: false });
}

/** Logs every day of the month (no-spend days) and spends `food` on the 5th. */
async function completeMonth(month: string, food: number): Promise<void> {
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  for (let d = 1; d <= days; d += 1) await confirmZeroDay(`${month}-${String(d).padStart(2, '0')}`);
  await spend(`${month}-05`, food);
}

/** May–July at 50,000 of food each: the starting point. */
async function recordStartingPoint(): Promise<void> {
  for (const m of ['2026-05', '2026-06', '2026-07']) await completeMonth(m, 50_000);
}

const statuses = async () => (await getJourney(TODAY)).steps.map((s) => s.status);

const EVIDENCE: JourneyEvidence = {
  recordedMonths: 0,
  neededMonths: 3,
  pictureReviewed: false,
  plannedMonth: null,
  beatStartMonth: null,
  reached: 0,
  skippedTo: 0,
};

describe('resolveJourney (VS-63)', () => {
  it('starts on Observe with every later step locked', () => {
    expect(resolveJourney(EVIDENCE)).toEqual({
      current: 'observe',
      earned: 0,
      steps: [
        { key: 'observe', status: 'current' },
        { key: 'see', status: 'locked' },
        { key: 'plan', status: 'locked' },
        { key: 'optimize', status: 'locked' },
        { key: 'grow', status: 'locked' },
      ],
    });
  });

  it('passes steps in order only: a plan does not count before the first months are seen', () => {
    const j = resolveJourney({ ...EVIDENCE, recordedMonths: 3, plannedMonth: '2026-08' });
    expect(j.current).toBe('see');
    expect(j.earned).toBe(1);
  });

  it('reaches Grow once the first four steps are passed', () => {
    const j = resolveJourney({
      ...EVIDENCE,
      recordedMonths: 3,
      pictureReviewed: true,
      plannedMonth: '2026-08',
      beatStartMonth: '2026-08',
    });
    expect(j.current).toBe('grow');
    expect(j.steps.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done', 'current']);
  });

  it('marks the steps jumped over as skipped', () => {
    const j = resolveJourney({ ...EVIDENCE, recordedMonths: 1, skippedTo: 2 });
    expect(j.current).toBe('plan');
    expect(j.steps.map((s) => s.status)).toEqual(['skipped', 'skipped', 'current', 'locked', 'locked']);
  });

  it('never locks a step again once it was reached', () => {
    const j = resolveJourney({ ...EVIDENCE, recordedMonths: 2, reached: 1 });
    expect(j.current).toBe('see');
    expect(j.steps[0].status).toBe('done');
  });
});

describe('getJourney (VS-63)', () => {
  it('counts the months recorded toward the starting point', async () => {
    await completeMonth('2026-08', 40_000);

    const journey = await getJourney(TODAY);

    expect(journey.current).toBe('observe');
    expect(journey.observe).toEqual({ recorded: 1, needed: 3 });
    expect(journey.start).toBeNull();
  });

  it('moves to See once three complete months exist, with what they cost', async () => {
    await recordStartingPoint();

    const journey = await getJourney(TODAY);

    expect(journey.current).toBe('see');
    expect(journey.start).toMatchObject({ total: 50_000, variable: 50_000 });
  });

  it('moves to Plan once the user has seen their first months', async () => {
    await recordStartingPoint();
    await markPictureReviewed();

    expect((await getJourney(TODAY)).current).toBe('plan');
  });

  it('passes Plan on a complete month with a budget, after the starting point', async () => {
    await recordStartingPoint();
    await markPictureReviewed();
    await completeMonth('2026-08', 60_000);
    await setCategoryBudget('2026-08', FOOD, 55_000);

    const journey = await getJourney(TODAY);

    expect(journey.current).toBe('optimize');
    expect(journey.plannedMonth).toBe('2026-08');
    expect(journey.latest).toEqual({ month: '2026-08', variable: 60_000 });
  });

  it('counts an explicit month total as a budget too', async () => {
    await recordStartingPoint();
    await markPictureReviewed();
    await completeMonth('2026-08', 60_000);
    await ensureMonthRow('2026-08');
    await setTotalBudget('2026-08', 200_000);

    expect((await getJourney(TODAY)).plannedMonth).toBe('2026-08');
  });

  it('does not count a budget set during the starting point or in the month still running', async () => {
    await recordStartingPoint();
    await markPictureReviewed();
    await setCategoryBudget('2026-06', FOOD, 45_000);
    await setCategoryBudget('2026-10', FOOD, 45_000);
    await spend('2026-10-02', 10_000);

    expect((await getJourney(TODAY)).current).toBe('plan');
  });

  it('does not count a budget on a month that was not fully logged', async () => {
    await recordStartingPoint();
    await markPictureReviewed();
    await spend('2026-08-05', 30_000);
    await setCategoryBudget('2026-08', FOOD, 55_000);

    expect((await getJourney(TODAY)).current).toBe('plan');
  });

  it('reaches Grow when a planned month spends less on variable costs than the start', async () => {
    await recordStartingPoint();
    await markPictureReviewed();
    await completeMonth('2026-08', 60_000);
    await setCategoryBudget('2026-08', FOOD, 55_000);
    await completeMonth('2026-09', 42_000);

    const journey = await getJourney(TODAY);

    expect(journey.current).toBe('grow');
    expect(journey.beatStartMonth).toBe('2026-09');
    expect(journey.latest).toEqual({ month: '2026-09', variable: 42_000 });
  });

  it('does not count a cheaper month from before the first plan', async () => {
    await recordStartingPoint();
    await markPictureReviewed();
    await completeMonth('2026-08', 30_000);
    await completeMonth('2026-09', 60_000);
    await setCategoryBudget('2026-09', FOOD, 55_000);

    const journey = await getJourney(TODAY);

    expect(journey.current).toBe('optimize');
    expect(journey.beatStartMonth).toBeNull();
  });

  it('skips ahead on request, and never backwards', async () => {
    await skipToStep('plan');
    expect(await statuses()).toEqual(['skipped', 'skipped', 'current', 'locked', 'locked']);

    await skipToStep('see');
    expect((await getJourney(TODAY)).current).toBe('plan');
  });

  it('keeps a reached step when the evidence later changes', async () => {
    await recordStartingPoint();
    await getJourney(TODAY);
    await execute("DELETE FROM zero_days WHERE date LIKE '2026-05-%'");

    const journey = await getJourney(TODAY);

    expect(journey.current).toBe('see');
    expect(journey.steps[0].status).toBe('done');
  });
});
