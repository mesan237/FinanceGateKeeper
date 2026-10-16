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

import { getAccountBalance, getAccountHistory } from '@/features/finance/accounts/accounts.balance';
// Fixture setup only: the debt slice creates the rows these balances read.
import { getDebtPayments, recordDebtPayment, removeDebtPayment } from '@/features/finance/debt/debt.payments';
import { createDebt, deleteDebt } from '@/features/finance/debt/debt.service';

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
const CASH = 1;
const MOMO = 2;

describe('debts in wallet balances (VS-44)', () => {
  it('lowers the wallet a loan was given from, and raises it as repayments come back', async () => {
    const id = await createDebt({ personName: 'Marie', amount: 50_000, direction: 'lent', accountId: MOMO, date: '2026-10-01' });
    expect(await getAccountBalance(MOMO)).toBe(-50_000);

    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });
    expect(await getAccountBalance(MOMO)).toBe(-30_000);
  });

  it('raises the wallet a borrowed sum landed in, and lowers whichever wallet repays it', async () => {
    const id = await createDebt({ personName: 'Awa', amount: 40_000, direction: 'owed', accountId: CASH, date: '2026-10-01' });
    expect(await getAccountBalance(CASH)).toBe(40_000);

    await recordDebtPayment(id, { amount: 15_000, accountId: MOMO, date: '2026-10-10' });
    expect(await getAccountBalance(CASH)).toBe(40_000);
    expect(await getAccountBalance(MOMO)).toBe(-15_000);
  });

  it('moves nothing for a debt or repayment without a wallet', async () => {
    const id = await createDebt({ personName: 'Paul', amount: 10_000, direction: 'lent' });
    await recordDebtPayment(id, { amount: 5_000, accountId: null, date: '2026-10-10' });

    expect(await getAccountBalance(CASH)).toBe(0);
    expect(await getAccountBalance(MOMO)).toBe(0);
  });

  it('undoes the money a removed repayment or a removed debt had moved', async () => {
    const id = await createDebt({ personName: 'Marie', amount: 50_000, direction: 'lent', accountId: MOMO, date: '2026-10-01' });
    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });
    const [payment] = await getDebtPayments(id);

    await removeDebtPayment(payment.id);
    expect(await getAccountBalance(MOMO)).toBe(-50_000);

    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });
    await deleteDebt(id);
    expect(await getAccountBalance(MOMO)).toBe(0);
  });

  it('names each loan and repayment in the wallet history', async () => {
    const id = await createDebt({ personName: 'Marie', amount: 50_000, direction: 'lent', accountId: MOMO, date: '2026-10-01' });
    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });

    const history = await getAccountHistory(MOMO);
    expect(history.map((h) => [h.kind, h.label, h.amount])).toEqual([
      ['debt_repaid_to_me', 'Repayment from Marie', 20_000],
      ['debt_lent', 'Lent to Marie', 50_000],
    ]);
  });
});
