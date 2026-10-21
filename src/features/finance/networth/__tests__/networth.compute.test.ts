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
import { getMonthFlows, getNetWorthAsOf, savingsRate } from '@/features/finance/networth/networth.compute';

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

async function income(amount: number, date: string, accountId: number | null = 1): Promise<void> {
  await execute(
    `INSERT INTO income (amount, source, note, date, account_id, created_at)
     VALUES (?, 'salary', NULL, ?, ?, '2026-09-01T00:00:00Z')`,
    [amount, date, accountId],
  );
}

async function expense(amount: number, date: string): Promise<void> {
  await execute(
    `INSERT INTO expenses (amount, category_id, date, account_id, created_at)
     VALUES (?, 1, ?, 1, '2026-09-01T00:00:00Z')`,
    [amount, date],
  );
}

async function debt(amount: number, direction: 'lent' | 'owed', date: string): Promise<number> {
  await execute(
    `INSERT INTO debts (person_name, amount, direction, date, status, created_at)
     VALUES ('Awa', ?, ?, ?, 'pending', '2026-09-01T00:00:00Z')`,
    [amount, direction, date],
  );
  const [{ id }] = (await mockState.driver!.query<{ id: number }>('SELECT last_insert_rowid() AS id')) as { id: number }[];
  return id;
}

describe('getNetWorthAsOf (VS-53)', () => {
  it('adds wallets and money lent, takes off what is owed, as of the date', async () => {
    await income(200_000, '2026-09-05');
    await income(50_000, '2026-10-02');
    await debt(30_000, 'lent', '2026-09-10');
    const owed = await debt(40_000, 'owed', '2026-09-12');
    await execute(
      "INSERT INTO debt_payments (debt_id, amount, date, created_at) VALUES (?, 10000, '2026-09-20', '2026-09-20T00:00:00Z')",
      [owed],
    );
    await execute(
      "INSERT INTO debt_payments (debt_id, amount, date, created_at) VALUES (?, 5000, '2026-10-03', '2026-10-03T00:00:00Z')",
      [owed],
    );

    expect(await getNetWorthAsOf('2026-09-30')).toEqual({
      wallets: 200_000,
      lent: 30_000,
      owed: 30_000,
      tontines: 0,
      total: 200_000,
    });
  });

  it('counts what is still to be repaid, interest included, on a debt with a total to repay (VS-54)', async () => {
    const lent = await debt(50_000, 'lent', '2026-09-10');
    await execute('UPDATE debts SET total_to_repay = 55000 WHERE id = ?', [lent]);

    expect((await getNetWorthAsOf('2026-09-30')).lent).toBe(55_000);
  });

  it('counts a tontine position: paid in minus received, by the date', async () => {
    await execute(
      `INSERT INTO tontines (name, contribution_amount, frequency, start_date, members, created_at)
       VALUES ('Njangi', 10000, 'weekly', '2026-09-01', 5, '2026-09-01T00:00:00Z')`,
    );
    for (const date of ['2026-09-01', '2026-09-08', '2026-10-06']) {
      await execute(
        `INSERT INTO tontine_payments (tontine_id, kind, cycle, amount, date, created_at)
         VALUES (1, 'contribution', 1, 10000, ?, '2026-09-01T00:00:00Z')`,
        [date],
      );
    }

    expect((await getNetWorthAsOf('2026-09-30')).tontines).toBe(20_000);
  });

  it('leaves deleted debts and hidden wallets out', async () => {
    await income(10_000, '2026-09-05', 2);
    await execute('UPDATE accounts SET is_active = 0 WHERE id = 2');
    const gone = await debt(30_000, 'owed', '2026-09-10');
    await execute("UPDATE debts SET deleted_at = '2026-09-11T00:00:00Z' WHERE id = ?", [gone]);

    expect(await getNetWorthAsOf('2026-09-30')).toEqual({ wallets: 0, lent: 0, owed: 0, tontines: 0, total: 0 });
  });
});

describe('getMonthFlows and savingsRate', () => {
  it('reads the month’s income received and spending', async () => {
    await income(250_000, '2026-09-05');
    await expense(150_000, '2026-09-10');
    await expense(50_000, '2026-10-01');

    expect(await getMonthFlows('2026-09')).toEqual({ income: 250_000, spending: 150_000 });
  });

  it('is the share of income kept, rounded to a whole percent', () => {
    expect(savingsRate(250_000, 150_000)).toBe(40);
    expect(savingsRate(100_000, 130_000)).toBe(-30);
  });

  it('has no rate without income', () => {
    expect(savingsRate(0, 20_000)).toBeNull();
  });
});
