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

import {
  getDebtPayments,
  recordDebtPayment,
  removeDebtPayment,
} from '@/features/finance/debt/debt.payments';
import {
  createDebt,
  deleteDebt,
  getDebtById,
  getDebts,
  getDueReminders,
  getOutstandingTotals,
  settleDebt,
  updateDebt,
} from '@/features/finance/debt/debt.service';

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

async function lendToMarie(amount = 50_000) {
  return createDebt({ personName: 'Marie', amount, direction: 'lent', accountId: MOMO, date: '2026-10-01' });
}

describe('a debt and its repayments (VS-44)', () => {
  it('stores the wallet the loan went through and starts with nothing repaid', async () => {
    const id = await lendToMarie();

    expect(await getDebtById(id)).toMatchObject({ accountId: MOMO, paid: 0, outstanding: 50_000 });
  });

  it('records a partial repayment, keeping the debt open and the history', async () => {
    const id = await lendToMarie();

    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10', note: 'first part' });

    expect(await getDebtById(id)).toMatchObject({ status: 'pending', paid: 20_000, outstanding: 30_000 });
    const [payment] = await getDebtPayments(id);
    expect(payment).toMatchObject({ amount: 20_000, accountId: MOMO, date: '2026-10-10', note: 'first part' });
  });

  it('settles the debt by itself once repayments cover it', async () => {
    const id = await lendToMarie();

    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });
    await recordDebtPayment(id, { amount: 30_000, accountId: MOMO, date: '2026-10-20' });

    const debt = await getDebtById(id);
    expect(debt).toMatchObject({ status: 'settled', outstanding: 0 });
    expect(debt?.settledAt).not.toBeNull();
  });

  it('rejects a repayment above what is still owed, not positive, or badly dated', async () => {
    const id = await lendToMarie();

    await expect(recordDebtPayment(id, { amount: 60_000, accountId: MOMO, date: '2026-10-10' })).rejects.toThrow();
    await expect(recordDebtPayment(id, { amount: 0, accountId: MOMO, date: '2026-10-10' })).rejects.toThrow();
    await expect(recordDebtPayment(id, { amount: 1_000, accountId: MOMO, date: '10/10/2026' })).rejects.toThrow();
  });

  it('refuses repayments on a settled or removed debt', async () => {
    const settled = await lendToMarie();
    await settleDebt(settled);
    const removed = await lendToMarie();
    await deleteDebt(removed);

    await expect(recordDebtPayment(settled, { amount: 1, accountId: null, date: '2026-10-10' })).rejects.toThrow();
    await expect(recordDebtPayment(removed, { amount: 1, accountId: null, date: '2026-10-10' })).rejects.toThrow();
  });

  it('reopens a settled debt when one of its repayments is removed', async () => {
    const id = await lendToMarie();
    await recordDebtPayment(id, { amount: 50_000, accountId: MOMO, date: '2026-10-10' });
    const [payment] = await getDebtPayments(id);

    await removeDebtPayment(payment.id);

    expect(await getDebtById(id)).toMatchObject({ status: 'pending', settledAt: null, outstanding: 50_000 });
    expect(await getDebtPayments(id)).toEqual([]);
  });
});

describe('settleDebt', () => {
  it('records what was still owed as the final repayment, through the chosen wallet', async () => {
    const id = await lendToMarie();
    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });

    await settleDebt(id, '2026-10-15T09:00:00.000Z', MOMO);

    const payments = await getDebtPayments(id);
    expect(payments[0]).toMatchObject({ amount: 30_000, accountId: MOMO, date: '2026-10-15' });
    expect(await getDebtById(id)).toMatchObject({ status: 'settled', outstanding: 0 });
  });
});

describe('outstanding figures', () => {
  it('subtract repayments from the totals and the reminders', async () => {
    const id = await createDebt({
      personName: 'Marie',
      amount: 50_000,
      direction: 'lent',
      dueDate: '2026-10-12',
    });
    await recordDebtPayment(id, { amount: 20_000, accountId: null, date: '2026-10-05' });

    expect(await getOutstandingTotals()).toEqual({ lent: 30_000, owed: 0 });
    const [reminder] = await getDueReminders('2026-10-11');
    expect(reminder.amount).toBe(30_000);
  });

  it('will not shrink a debt below what has already been repaid', async () => {
    const id = await lendToMarie();
    await recordDebtPayment(id, { amount: 20_000, accountId: MOMO, date: '2026-10-10' });

    await expect(updateDebt(id, { amount: 10_000 })).rejects.toThrow();
    await updateDebt(id, { amount: 40_000, accountId: null });
    expect(await getDebtById(id)).toMatchObject({ amount: 40_000, accountId: null, outstanding: 20_000 });
  });
});

describe('deleteDebt', () => {
  it('hides the debt but keeps the row, marked removed, so the removal syncs', async () => {
    const id = await lendToMarie();

    await deleteDebt(id);

    expect(await getDebtById(id)).toBeNull();
    expect(await getDebts('lent')).toEqual([]);
    const row = sqlite.prepare('SELECT deleted_at, sync_status FROM debts WHERE id = ?').get(id) as {
      deleted_at: string | null;
      sync_status: string;
    };
    expect(row.deleted_at).not.toBeNull();
    expect(row.sync_status).toBe('pending');
  });
});
