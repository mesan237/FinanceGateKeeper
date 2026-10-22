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

import { getCategoryDetail } from '@/features/finance/budget/budget.categoryDetail';
import { createEvent } from '@/features/finance/events/events.service';
import { setCategoryCostType } from '@/features/finance/expenses/expenses.costType';
import { recordRefund } from '@/features/finance/expenses/expenses.refunds';
import {
  confirmZeroDay,
  createCategory,
  createExpense,
} from '@/features/finance/expenses/expenses.service';

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

interface SpendOptions {
  categoryId?: number;
  subcategoryId?: number | null;
  note?: string | null;
  isRecurring?: boolean;
  isUnplanned?: boolean;
  eventId?: number | null;
}

async function spend(date: string, amount: number, options: SpendOptions = {}): Promise<number> {
  return createExpense({
    amount,
    categoryId: options.categoryId ?? FOOD,
    subcategoryId: options.subcategoryId ?? null,
    note: options.note ?? null,
    date,
    isRecurring: options.isRecurring ?? false,
    isUnplanned: options.isUnplanned ?? false,
    eventId: options.eventId ?? null,
  });
}

/** Confirms a zero-spend day for every day of the month, so it counts as complete. */
async function logWholeMonth(month: string): Promise<void> {
  const days = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  for (let d = 1; d <= days; d += 1) await confirmZeroDay(`${month}-${String(d).padStart(2, '0')}`);
}

describe('getCategoryDetail — where the money went (VS-56)', () => {
  it('splits the month by subcategory, largest first, with each share', async () => {
    const market = await createCategory({ name: 'Market', parentId: FOOD });
    const restaurant = await createCategory({ name: 'Street food', parentId: FOOD });
    await spend('2026-08-02', 30_000, { subcategoryId: market });
    await spend('2026-08-05', 10_000, { subcategoryId: restaurant });
    await spend('2026-08-09', 20_000, { subcategoryId: market });
    await spend('2026-08-11', 15_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.spent).toBe(75_000);
    expect(detail.parts).toEqual([
      { subcategoryId: market, name: 'Market', amount: 50_000, count: 2, sharePct: (50_000 / 75_000) * 100, usual: null },
      { subcategoryId: null, name: null, amount: 15_000, count: 1, sharePct: 20, usual: null },
      { subcategoryId: restaurant, name: 'Street food', amount: 10_000, count: 1, sharePct: (10_000 / 75_000) * 100, usual: null },
    ]);
  });

  it('leaves the split empty when no expense uses a subcategory', async () => {
    await spend('2026-08-02', 30_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.parts).toEqual([]);
  });

  it('only reads the requested category and month', async () => {
    await spend('2026-08-02', 30_000);
    await spend('2026-08-03', 9_000, { categoryId: TRANSPORT });
    await spend('2026-07-30', 4_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.spent).toBe(30_000);
  });
});

describe('getCategoryDetail — repeated spending', () => {
  it('groups small purchases that share a note, ignoring case and spaces', async () => {
    await spend('2026-08-01', 1_500, { categoryId: TRANSPORT, note: 'Taxi' });
    await spend('2026-08-02', 1_500, { categoryId: TRANSPORT, note: 'taxi ' });
    await spend('2026-08-03', 2_000, { categoryId: TRANSPORT, note: 'TAXI' });
    await spend('2026-08-04', 5_000, { categoryId: TRANSPORT, note: 'Bus to Douala' });
    await spend('2026-08-05', 700, { categoryId: TRANSPORT });

    const detail = await getCategoryDetail('2026-08', TRANSPORT);

    expect(detail.repeats).toEqual([{ label: 'Taxi', count: 3, total: 5_000 }]);
  });

  it('keeps the three biggest repeats, by total', async () => {
    for (const [note, amount] of [
      ['bread', 500],
      ['water', 300],
      ['snack', 1_000],
      ['coffee', 2_000],
    ] as const) {
      await spend('2026-08-01', amount, { note });
      await spend('2026-08-02', amount, { note });
    }

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.repeats.map((r) => r.label)).toEqual(['coffee', 'snack', 'bread']);
  });
});

describe('getCategoryDetail — refunds', () => {
  it('nets a refund out of the total and out of the split', async () => {
    const market = await createCategory({ name: 'Market', parentId: FOOD });
    const purchase = await spend('2026-08-02', 20_000, { subcategoryId: market, note: 'Rice sack' });
    await spend('2026-08-03', 8_000, { subcategoryId: market });
    await recordRefund(purchase, { amount: 15_000, accountId: null, date: '2026-08-04' });

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.spent).toBe(13_000);
    expect(detail.parts).toEqual([
      { subcategoryId: market, name: 'Market', amount: 13_000, count: 2, sharePct: 100, usual: null },
    ]);
  });

  it('does not count a refund as a repeated purchase', async () => {
    const purchase = await spend('2026-08-02', 2_000, { note: 'Bread' });
    await spend('2026-08-03', 2_000, { note: 'Bread' });
    await recordRefund(purchase, { amount: 2_000, accountId: null, date: '2026-08-04', note: 'Bread' });

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.repeats).toEqual([{ label: 'Bread', count: 2, total: 4_000 }]);
  });
});

describe('getCategoryDetail — fixed, variable and imprévus', () => {
  it('splits spending into what can and cannot easily be cut', async () => {
    const rent = await createCategory({ name: 'Canteen', parentId: FOOD });
    await setCategoryCostType(rent, 'fixed');
    await spend('2026-08-01', 25_000, { subcategoryId: rent });
    await spend('2026-08-02', 10_000, { isRecurring: true });
    await spend('2026-08-03', 6_000);
    await spend('2026-08-04', 4_000, { isUnplanned: true });

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.kinds).toEqual({ fixed: 35_000, variable: 6_000, unexpected: 4_000 });
  });
});

describe('getCategoryDetail — compared with a usual month', () => {
  it('averages the category over complete months before this one', async () => {
    await logWholeMonth('2026-06');
    await logWholeMonth('2026-07');
    await spend('2026-06-10', 40_000);
    await spend('2026-07-10', 20_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.average).toBe(30_000);
  });

  it('has no average until a month is complete', async () => {
    await spend('2026-07-10', 20_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.average).toBeNull();
  });
});

describe('getCategoryDetail — each subcategory against its usual month', () => {
  it('gives each part its own average over the same complete months', async () => {
    const market = await createCategory({ name: 'Market', parentId: FOOD });
    const street = await createCategory({ name: 'Street food', parentId: FOOD });
    await logWholeMonth('2026-06');
    await logWholeMonth('2026-07');
    await spend('2026-06-10', 20_000, { subcategoryId: market });
    await spend('2026-07-10', 30_000, { subcategoryId: market });
    await spend('2026-07-11', 6_000, { subcategoryId: street });
    await spend('2026-08-02', 25_000, { subcategoryId: market });
    await spend('2026-08-03', 9_000, { subcategoryId: street });
    await spend('2026-08-04', 1_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.average).toBe(28_000);
    const usualOf = new Map(detail.parts.map((p) => [p.subcategoryId, p.usual]));
    expect(usualOf.get(market)).toBe(25_000);
    expect(usualOf.get(street)).toBe(3_000);
    // Complete months exist, so spending never filed there is a real zero.
    expect(usualOf.get(null)).toBe(0);
  });

  it('ignores an incomplete month when averaging', async () => {
    await logWholeMonth('2026-07');
    await spend('2026-06-10', 90_000);
    await spend('2026-07-10', 20_000);

    const detail = await getCategoryDetail('2026-08', FOOD);

    expect(detail.average).toBe(20_000);
  });
});

describe('getCategoryDetail — one subcategory (VS-59)', () => {
  it('narrows the month to one subcategory: its spend, repeats and usual month, no split', async () => {
    const market = await createCategory({ name: 'Market', parentId: FOOD });
    const street = await createCategory({ name: 'Street food', parentId: FOOD });
    await logWholeMonth('2026-07');
    await spend('2026-07-10', 8_000, { subcategoryId: street });
    await spend('2026-08-02', 30_000, { subcategoryId: market });
    await spend('2026-08-03', 2_000, { subcategoryId: street, note: 'Beignets' });
    await spend('2026-08-04', 2_500, { subcategoryId: street, note: 'beignets' });
    await spend('2026-08-05', 1_000);

    const detail = await getCategoryDetail('2026-08', FOOD, street);

    expect(detail.subcategory).toEqual({ id: street, name: 'Street food' });
    expect(detail.spent).toBe(4_500);
    expect(detail.parts).toEqual([]);
    expect(detail.repeats).toEqual([{ label: 'Beignets', count: 2, total: 4_500 }]);
    expect(detail.average).toBe(8_000);
  });

  it('reads "none" as the spending filed under the category itself', async () => {
    const market = await createCategory({ name: 'Market', parentId: FOOD });
    await spend('2026-08-02', 30_000, { subcategoryId: market });
    await spend('2026-08-05', 1_000);

    const detail = await getCategoryDetail('2026-08', FOOD, 'none');

    expect(detail.subcategory).toEqual({ id: null, name: null });
    expect(detail.spent).toBe(1_000);
  });

  it('leaves the whole category unnarrowed without a subcategory', async () => {
    await spend('2026-08-05', 1_000);

    expect((await getCategoryDetail('2026-08', FOOD)).subcategory).toBeNull();
  });
});

describe('getCategoryDetail — why the money went (VS-62)', () => {
  it('splits the month into routine, events, unexpected and everyday, naming the events', async () => {
    const wedding = await createEvent({ name: 'Marie’s wedding', date: '2026-08-15' });
    const funeral = await createEvent({ name: 'Funeral', date: '2026-08-20' });
    await spend('2026-08-01', 1_000, { categoryId: TRANSPORT, isRecurring: true });
    await spend('2026-08-02', 1_000, { categoryId: TRANSPORT, isRecurring: true });
    await spend('2026-08-15', 6_000, { categoryId: TRANSPORT, eventId: wedding });
    await spend('2026-08-20', 9_000, { categoryId: TRANSPORT, eventId: funeral });
    await spend('2026-08-21', 3_000, { categoryId: TRANSPORT, isUnplanned: true });
    await spend('2026-08-22', 2_500, { categoryId: TRANSPORT });

    const detail = await getCategoryDetail('2026-08', TRANSPORT);

    expect(detail.reasons).toEqual({ routine: 2_000, event: 15_000, unexpected: 3_000, everyday: 2_500 });
    expect(detail.reasonEvents).toEqual([
      { eventId: funeral, name: 'Funeral', amount: 9_000 },
      { eventId: wedding, name: 'Marie’s wedding', amount: 6_000 },
    ]);
  });

  it('reads the reasons of one subcategory only when narrowed', async () => {
    const taxi = await createCategory({ name: 'Moto', parentId: TRANSPORT });
    await spend('2026-08-01', 1_000, { categoryId: TRANSPORT, subcategoryId: taxi });
    await spend('2026-08-02', 5_000, { categoryId: TRANSPORT, isRecurring: true });

    const detail = await getCategoryDetail('2026-08', TRANSPORT, taxi);

    expect(detail.reasons).toEqual({ routine: 0, event: 0, unexpected: 0, everyday: 1_000 });
  });
});
