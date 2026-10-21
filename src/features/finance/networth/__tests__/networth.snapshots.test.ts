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
  closeMonths,
  getSnapshots,
  recalculateMonth,
} from '@/features/finance/networth/networth.snapshots';

let sqlite: Database.Database;

const TODAY = '2026-10-21';

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

async function income(amount: number, date: string): Promise<void> {
  await execute(
    `INSERT INTO income (amount, source, note, date, account_id, created_at)
     VALUES (?, 'salary', NULL, ?, 1, '2026-08-01T00:00:00Z')`,
    [amount, date],
  );
}

async function expense(amount: number, date: string): Promise<void> {
  await execute(
    `INSERT INTO expenses (amount, category_id, date, account_id, created_at)
     VALUES (?, 1, ?, 1, '2026-08-01T00:00:00Z')`,
    [amount, date],
  );
}

describe('closeMonths (VS-53)', () => {
  it('snapshots every closed month since the first entry, never the current one', async () => {
    await income(200_000, '2026-08-05');
    await expense(50_000, '2026-08-20');
    await income(200_000, '2026-09-05');
    await expense(120_000, '2026-09-20');

    await closeMonths(TODAY);
    const snapshots = await getSnapshots();

    expect(snapshots.map((s) => s.month)).toEqual(['2026-09', '2026-08']);
    expect(snapshots[1]).toMatchObject({ netWorth: 150_000, income: 200_000, spending: 50_000, savingsRate: 75 });
    expect(snapshots[0]).toMatchObject({ netWorth: 230_000, savingsRate: 40 });
  });

  it('does nothing without any entry yet', async () => {
    await closeMonths(TODAY);

    expect(await getSnapshots()).toEqual([]);
  });

  it('keeps a stored month as it was when an old entry is edited later', async () => {
    await income(200_000, '2026-09-05');
    await closeMonths(TODAY);

    await expense(80_000, '2026-09-10');
    await closeMonths(TODAY);

    expect((await getSnapshots())[0]).toMatchObject({ month: '2026-09', netWorth: 200_000, spending: 0 });
  });

  it('refreshes a month on purpose with recalculate, keeping the earlier figure on record', async () => {
    await income(200_000, '2026-09-05');
    await closeMonths(TODAY);
    await expense(80_000, '2026-09-10');

    await recalculateMonth('2026-09');

    expect((await getSnapshots())[0]).toMatchObject({ month: '2026-09', netWorth: 120_000, spending: 80_000 });
    const { n } = sqlite.prepare("SELECT COUNT(*) AS n FROM month_snapshots WHERE month = '2026-09'").get() as { n: number };
    expect(n).toBe(2);
  });

  it('waits to close a month while one of its recurring bills is not logged yet', async () => {
    await income(200_000, '2026-08-05');
    await execute(
      `INSERT INTO recurring_expenses (label, amount, category_id, frequency, next_due_date, is_active, created_at)
       VALUES ('Rent', 50000, 1, 'monthly', '2026-09-25', 1, '2026-08-01T00:00:00Z')`,
    );

    await closeMonths(TODAY);
    expect((await getSnapshots()).map((s) => s.month)).toEqual(['2026-08']);

    // The auto-logger logs September's rent and moves the bill on.
    await expense(50_000, '2026-09-25');
    await execute("UPDATE recurring_expenses SET next_due_date = '2026-10-25'");
    await closeMonths(TODAY);

    expect((await getSnapshots())[0]).toMatchObject({ month: '2026-09', spending: 50_000 });
  });

  it('looks back at most 24 months', async () => {
    await income(1_000, '2022-01-05');

    await closeMonths(TODAY);

    const months = (await getSnapshots()).map((s) => s.month);
    expect(months).toHaveLength(24);
    expect(months[23]).toBe('2024-10');
  });
});
