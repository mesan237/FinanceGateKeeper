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
import { confirmBalance, getAccountBalance } from '@/features/finance/accounts/accounts.service';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  await execute(
    `INSERT INTO tontines (name, contribution_amount, frequency, start_date, members, payout_turn, account_id, created_at)
     VALUES ('Njangi', 10000, 'weekly', '2026-10-05', 5, 2, 1, '2026-10-01T08:00:00Z')`,
  );
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

async function payment(
  kind: 'contribution' | 'payout',
  amount: number,
  date: string,
  accountId: number | null = 1,
  deletedAt: string | null = null,
): Promise<void> {
  await execute(
    `INSERT INTO tontine_payments (tontine_id, kind, cycle, amount, account_id, date, created_at, deleted_at)
     VALUES (1, ?, 1, ?, ?, ?, '2026-10-05T08:00:00Z', ?)`,
    [kind, amount, accountId, date, deletedAt],
  );
}

describe('wallet balances and tontines (VS-51)', () => {
  it('takes contributions out of the wallet and puts the payout in', async () => {
    await payment('contribution', 10_000, '2026-10-05');
    await payment('contribution', 10_000, '2026-10-12');
    await payment('payout', 50_000, '2026-10-12');

    expect(await getAccountBalance(1)).toBe(30_000);
  });

  it('ignores removed payments and payments through no wallet', async () => {
    await payment('contribution', 10_000, '2026-10-05', 1, '2026-10-06T08:00:00Z');
    await payment('contribution', 10_000, '2026-10-12', null);

    expect(await getAccountBalance(1)).toBe(0);
  });

  it('ignores the payments of a deleted tontine', async () => {
    await payment('contribution', 10_000, '2026-10-05');
    await execute("UPDATE tontines SET deleted_at = '2026-10-07T08:00:00Z'");

    expect(await getAccountBalance(1)).toBe(0);
  });

  it('respects a balance check: only later tontine money moves a confirmed balance', async () => {
    await payment('contribution', 10_000, '2026-10-05');
    await confirmBalance(1, 40_000, '2026-10-08');
    await payment('contribution', 10_000, '2026-10-12');

    expect(await getAccountBalance(1)).toBe(30_000);
  });
});
