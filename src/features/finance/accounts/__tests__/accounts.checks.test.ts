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
import { getAccountBalance, getAccountHistory, getUnassignedSpending } from '@/features/finance/accounts/accounts.balance';
import {
  confirmBalance,
  getBalanceChecks,
  removeBalanceCheck,
} from '@/features/finance/accounts/accounts.checks';

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

/** Seeded wallets: 1 Cash, 2 MTN MoMo. */
const MOMO = 2;

async function spend(amount: number, date: string, accountId: number | null = MOMO, createdAt = `${date}T12:00:00Z`) {
  await execute(
    `INSERT INTO expenses (amount, category_id, date, is_recurring, account_id, created_at)
     VALUES (?, 1, ?, 0, ?, ?)`,
    [amount, date, accountId, createdAt],
  );
}

async function earn(amount: number, date: string, createdAt = `${date}T12:00:00Z`) {
  await execute(
    `INSERT INTO income (amount, source, date, account_id, created_at)
     VALUES (?, 'salary', ?, ?, ?)`,
    [amount, date, MOMO, createdAt],
  );
}

describe('confirmBalance (VS-42)', () => {
  it('pins the wallet to the confirmed figure and records how far off the app was', async () => {
    await earn(50_000, '2026-10-01');
    await spend(5_000, '2026-10-05');

    await confirmBalance(MOMO, 43_500, '2026-10-15');

    expect(await getAccountBalance(MOMO)).toBe(43_500);
    const [check] = await getBalanceChecks(MOMO);
    expect(check).toMatchObject({ balance: 43_500, difference: -1_500, date: '2026-10-15' });
  });

  it('moves the balance only by what happens after the check', async () => {
    await confirmBalance(MOMO, 40_000, '2026-10-15');
    await spend(2_000, '2026-10-16');
    await earn(10_000, '2026-10-20');

    expect(await getAccountBalance(MOMO)).toBe(48_000);
  });

  it('does not let a back-logged older expense shift a confirmed balance', async () => {
    await confirmBalance(MOMO, 40_000, '2026-10-15');
    await spend(7_000, '2026-10-02');

    expect(await getAccountBalance(MOMO)).toBe(40_000);
  });

  it('counts a same-day entry only if it was saved after the check', async () => {
    await execute(
      `INSERT INTO balance_checks (account_id, balance, difference, date, created_at)
       VALUES (?, 40000, 0, '2026-10-15', '2026-10-15T10:00:00Z')`,
      [MOMO],
    );
    await spend(1_000, '2026-10-15', MOMO, '2026-10-15T09:00:00Z');
    await spend(2_000, '2026-10-15', MOMO, '2026-10-15T11:00:00Z');

    expect(await getAccountBalance(MOMO)).toBe(38_000);
  });

  it('uses the latest check when there are several', async () => {
    await confirmBalance(MOMO, 40_000, '2026-10-01');
    await confirmBalance(MOMO, 25_000, '2026-10-10');

    expect(await getAccountBalance(MOMO)).toBe(25_000);
  });

  it('leaves other wallets alone', async () => {
    await confirmBalance(MOMO, 40_000, '2026-10-15');
    expect(await getAccountBalance(1)).toBe(0);
  });

  it('rejects a balance that is not whole FCFA, or a malformed date', async () => {
    await expect(confirmBalance(MOMO, 10.5, '2026-10-15')).rejects.toThrow();
    await expect(confirmBalance(MOMO, 10_000, '15/10/2026')).rejects.toThrow();
  });
});

describe('removeBalanceCheck', () => {
  it('soft-deletes the check, so the balance falls back to the transactions', async () => {
    await earn(50_000, '2026-10-01');
    await confirmBalance(MOMO, 43_500, '2026-10-15');
    const [check] = await getBalanceChecks(MOMO);

    await removeBalanceCheck(check.id);

    expect(await getAccountBalance(MOMO)).toBe(50_000);
    expect(await getBalanceChecks(MOMO)).toEqual([]);
    const row = sqlite.prepare('SELECT deleted_at FROM balance_checks').get() as { deleted_at: string | null };
    expect(row.deleted_at).not.toBeNull();
  });
});

describe('account history', () => {
  it('lists a balance check with the difference it corrected', async () => {
    await earn(50_000, '2026-10-01');
    await confirmBalance(MOMO, 48_000, '2026-10-15');

    const history = await getAccountHistory(MOMO);
    expect(history[0]).toMatchObject({ kind: 'balance_check', amount: -2_000, date: '2026-10-15' });
  });
});

describe('getUnassignedSpending', () => {
  it('counts expenses that no wallet accounts for', async () => {
    await spend(3_000, '2026-10-01', null);
    await spend(4_000, '2026-10-02', null);
    await spend(9_000, '2026-10-03', MOMO);

    expect(await getUnassignedSpending()).toEqual({ count: 2, total: 7_000 });
  });
});
