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

import { getAccountBalance, hideAccount } from '@/features/finance/accounts/accounts.service';
import {
  createTontine,
  deleteTontine,
  getTontineDetail,
  getTontines,
  payContribution,
  recordPayout,
  removePayment,
  updateTontine,
} from '@/features/finance/tontines/tontines.service';
import type { NewTontine } from '@/features/finance/tontines/tontines.types';

let sqlite: Database.Database;

const TODAY = '2026-10-18';

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

function njangi(overrides: Partial<NewTontine> = {}): NewTontine {
  return {
    name: 'Njangi',
    contributionAmount: 10_000,
    frequency: 'weekly',
    startDate: '2026-10-05',
    members: 5,
    payoutTurn: 3,
    accountId: 1,
    ...overrides,
  };
}

describe('createTontine', () => {
  it('saves a tontine and plans its cycles', async () => {
    const id = await createTontine(njangi());

    const detail = await getTontineDetail(id, TODAY);
    expect(detail?.cycles).toHaveLength(5);
    expect(detail?.summary.payoutAmount).toBe(50_000);
  });

  it('accepts a tontine whose turn is not drawn yet', async () => {
    const id = await createTontine(njangi({ payoutTurn: null }));

    expect((await getTontineDetail(id, TODAY))?.payoutTurn).toBeNull();
  });

  it('rejects bad input', async () => {
    await expect(createTontine(njangi({ name: ' ' }))).rejects.toThrow();
    await expect(createTontine(njangi({ contributionAmount: 0 }))).rejects.toThrow();
    await expect(createTontine(njangi({ members: 1 }))).rejects.toThrow();
    await expect(createTontine(njangi({ payoutTurn: 6 }))).rejects.toThrow();
    await expect(createTontine(njangi({ startDate: '2026-02-30' }))).rejects.toThrow();
  });

  it('refuses a hidden wallet', async () => {
    await hideAccount(2);

    await expect(createTontine(njangi({ accountId: 2 }))).rejects.toThrow();
  });
});

describe('contributions and the payout', () => {
  let id: number;

  beforeEach(async () => {
    id = await createTontine(njangi());
  });

  it('ticks a contribution paid from a wallet, which leaves the wallet', async () => {
    await payContribution(id, 1, 1, '2026-10-05');

    const detail = await getTontineDetail(id, TODAY);
    expect(detail?.cycles[0].status).toBe('paid');
    expect(detail?.summary.paidIn).toBe(10_000);
    expect(await getAccountBalance(1)).toBe(-10_000);
  });

  it('refuses to pay the same cycle twice, or a cycle beyond the members', async () => {
    await payContribution(id, 1, 1, '2026-10-05');

    await expect(payContribution(id, 1, 1, '2026-10-05')).rejects.toThrow();
    await expect(payContribution(id, 6, 1, '2026-10-05')).rejects.toThrow();
  });

  it('records the payout into a wallet, once', async () => {
    await recordPayout(id, 50_000, 2, '2026-10-19');

    expect((await getTontineDetail(id, TODAY))?.summary.received).toBe(50_000);
    expect(await getAccountBalance(2)).toBe(50_000);
    await expect(recordPayout(id, 50_000, 2, '2026-10-19')).rejects.toThrow();
  });

  it('needs the turn before a payout can be recorded', async () => {
    const pending = await createTontine(njangi({ payoutTurn: null }));

    await expect(recordPayout(pending, 50_000, 2, '2026-10-19')).rejects.toThrow();
  });

  it('un-ticks a contribution, giving the money back to the wallet', async () => {
    await payContribution(id, 1, 1, '2026-10-05');
    const paymentId = (await getTontineDetail(id, TODAY))!.cycles[0].payment!.id;

    await removePayment(paymentId);

    expect((await getTontineDetail(id, TODAY))?.cycles[0].status).toBe('overdue');
    expect(await getAccountBalance(1)).toBe(0);
  });
});

describe('updateTontine / deleteTontine', () => {
  it('sets the turn once the draw is done', async () => {
    const id = await createTontine(njangi({ payoutTurn: null }));

    await updateTontine(id, { payoutTurn: 4 });

    expect((await getTontineDetail(id, TODAY))?.summary.payoutDate).toBe('2026-10-26');
  });

  it('cannot drop below the cycles already paid', async () => {
    const id = await createTontine(njangi());
    await payContribution(id, 4, 1, '2026-10-26');

    await expect(updateTontine(id, { members: 3 })).rejects.toThrow();
  });

  it('soft-deletes a tontine, and its money stops moving wallets', async () => {
    const id = await createTontine(njangi());
    await payContribution(id, 1, 1, '2026-10-05');

    await deleteTontine(id);

    expect(await getTontines(TODAY)).toEqual([]);
    expect(await getTontineDetail(id, TODAY)).toBeNull();
    expect(await getAccountBalance(1)).toBe(0);
  });
});

describe('getTontines', () => {
  it('lists each tontine with its summary, oldest first', async () => {
    await createTontine(njangi());
    await createTontine(njangi({ name: 'Office tontine', frequency: 'monthly', members: 10 }));

    const list = await getTontines(TODAY);

    expect(list.map((t) => t.name)).toEqual(['Njangi', 'Office tontine']);
    expect(list[0].summary.overdueCount).toBe(2);
  });
});
