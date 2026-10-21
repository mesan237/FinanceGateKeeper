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

import { getAccountBalance } from '@/features/finance/accounts/accounts.service';
import {
  getDebtPayments,
  payInstalment,
  recordDebtPayment,
  removeDebtPayment,
} from '@/features/finance/debt/debt.payments';
import { createDebt, getDebtById, getOutstandingTotals, settleDebt } from '@/features/finance/debt/debt.service';
import type { NewDebt } from '@/features/finance/debt/debt.types';

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

function loan(overrides: Partial<NewDebt> = {}): NewDebt {
  return {
    personName: 'Microfinance',
    amount: 100_000,
    direction: 'owed',
    date: '2026-09-01',
    accountId: 1,
    totalToRepay: 120_000,
    schedule: { count: 6, frequency: 'monthly', firstDate: '2026-10-01' },
    ...overrides,
  };
}

describe('debt terms (VS-54)', () => {
  it('keeps what is repayable apart from what was borrowed', async () => {
    const id = await createDebt(loan());

    const debt = await getDebtById(id);
    expect(debt).toMatchObject({
      amount: 100_000,
      totalToRepay: 120_000,
      repayable: 120_000,
      outstanding: 120_000,
      schedule: { count: 6, frequency: 'monthly', firstDate: '2026-10-01' },
    });
    // The loan itself moves only the amount borrowed into the wallet.
    expect(await getAccountBalance(1)).toBe(100_000);
  });

  it('treats a debt without terms as before: repayable is the amount', async () => {
    const id = await createDebt(loan({ totalToRepay: null, schedule: null }));

    expect(await getDebtById(id)).toMatchObject({ totalToRepay: null, repayable: 100_000, schedule: null });
  });

  it('refuses a total below the amount and a malformed schedule', async () => {
    await expect(createDebt(loan({ totalToRepay: 90_000 }))).rejects.toThrow();
    await expect(createDebt(loan({ schedule: { count: 1, frequency: 'monthly', firstDate: '2026-10-01' } }))).rejects.toThrow();
    await expect(createDebt(loan({ schedule: { count: 6, frequency: 'monthly', firstDate: '2026-13-01' } }))).rejects.toThrow();
  });

  it('counts the total to repay in what is outstanding per direction', async () => {
    await createDebt(loan());
    await createDebt(loan({ direction: 'lent', totalToRepay: 55_000, amount: 50_000, schedule: null }));

    expect(await getOutstandingTotals()).toEqual({ owed: 120_000, lent: 55_000 });
  });

  it('pays one instalment at its amount, through a wallet, once', async () => {
    const id = await createDebt(loan());

    await payInstalment(id, 1, 1, '2026-10-01');

    expect((await getDebtById(id))?.outstanding).toBe(100_000);
    expect((await getDebtPayments(id))[0]).toMatchObject({ amount: 20_000, instalment: 1 });
    await expect(payInstalment(id, 1, 1, '2026-10-01')).rejects.toThrow();
    await expect(payInstalment(id, 7, 1, '2026-10-01')).rejects.toThrow();
  });

  it('settles the debt when the last instalment is paid, and reopens it when one is undone', async () => {
    const id = await createDebt(loan({ totalToRepay: 100_000, schedule: { count: 3, frequency: 'monthly', firstDate: '2026-10-01' } }));
    for (const n of [1, 2, 3]) await payInstalment(id, n, 1, '2026-10-01');

    expect((await getDebtById(id))?.status).toBe('settled');
    const last = (await getDebtPayments(id)).find((p) => p.instalment === 3)!;
    expect(last.amount).toBe(33_334);

    await removeDebtPayment(last.id);
    expect((await getDebtById(id))).toMatchObject({ status: 'pending', outstanding: 33_334 });
  });

  it('lets a free repayment and settling cover the total, not just the amount', async () => {
    const id = await createDebt(loan({ schedule: null }));

    await recordDebtPayment(id, { amount: 110_000, accountId: 1, date: '2026-10-05' });
    expect((await getDebtById(id))?.status).toBe('pending');

    await settleDebt(id, '2026-10-06T08:00:00Z', 1);
    expect((await getDebtPayments(id)).map((p) => p.amount).sort()).toEqual([10_000, 110_000]);
  });
});
