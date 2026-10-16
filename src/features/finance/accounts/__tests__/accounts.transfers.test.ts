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
import { getTransfers, logTransfer } from '@/features/finance/accounts/accounts.service';
import {
  getTransferById,
  removeTransfer,
  updateTransfer,
} from '@/features/finance/accounts/accounts.transfers';
import { getTransactionFeed } from '@/services/transactions';

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

/** Seeded wallets: 1 Cash, 2 MTN MoMo, 3 Orange Money. */
const CASH = 1;
const MOMO = 2;
const ORANGE = 3;

describe('getTransferById (VS-43)', () => {
  it('returns a live transfer, and null once it is removed or never existed', async () => {
    const { id } = await logTransfer(CASH, MOMO, 5_000, '2026-10-15', 'Top-up');

    expect(await getTransferById(id)).toMatchObject({
      fromAccountId: CASH,
      toAccountId: MOMO,
      amount: 5_000,
      date: '2026-10-15',
      note: 'Top-up',
    });

    await removeTransfer(id);
    expect(await getTransferById(id)).toBeNull();
    expect(await getTransferById(999)).toBeNull();
  });
});

describe('updateTransfer', () => {
  it('corrects the amount, wallets, date and note, and the balances follow', async () => {
    const { id } = await logTransfer(CASH, MOMO, 5_000, '2026-10-15');

    await updateTransfer(id, { fromAccountId: CASH, toAccountId: ORANGE, amount: 7_000, date: '2026-10-14', note: 'Fixed' });

    expect(await getTransferById(id)).toMatchObject({ toAccountId: ORANGE, amount: 7_000, date: '2026-10-14', note: 'Fixed' });
    expect(await getAccountBalance(CASH)).toBe(-7_000);
    expect(await getAccountBalance(MOMO)).toBe(0);
    expect(await getAccountBalance(ORANGE)).toBe(7_000);
  });

  it('rejects the same wallet on both sides, a non-positive amount, or a malformed date', async () => {
    const { id } = await logTransfer(CASH, MOMO, 5_000, '2026-10-15');
    const base = { fromAccountId: CASH, toAccountId: MOMO, amount: 5_000, date: '2026-10-15', note: null };

    await expect(updateTransfer(id, { ...base, toAccountId: CASH })).rejects.toThrow();
    await expect(updateTransfer(id, { ...base, amount: 0 })).rejects.toThrow();
    await expect(updateTransfer(id, { ...base, date: '15/10/2026' })).rejects.toThrow();
  });

  it('refuses to edit a removed transfer', async () => {
    const { id } = await logTransfer(CASH, MOMO, 5_000, '2026-10-15');
    await removeTransfer(id);

    await expect(
      updateTransfer(id, { fromAccountId: CASH, toAccountId: MOMO, amount: 1, date: '2026-10-15', note: null }),
    ).rejects.toThrow();
  });
});

describe('removeTransfer', () => {
  it('takes the transfer out of balances, history, the monthly list and the feed', async () => {
    const { id } = await logTransfer(CASH, MOMO, 5_000, '2026-10-15');

    await removeTransfer(id);

    expect(await getAccountBalance(CASH)).toBe(0);
    expect(await getAccountBalance(MOMO)).toBe(0);
    expect(await getAccountHistory(MOMO)).toEqual([]);
    expect(await getTransfers('2026-10')).toEqual([]);
    expect(await getTransactionFeed('2026-10')).toEqual([]);
  });

  it('keeps the row, marked removed, so the removal syncs instead of resurrecting', async () => {
    const { id } = await logTransfer(CASH, MOMO, 5_000, '2026-10-15');

    await removeTransfer(id);

    const row = sqlite.prepare('SELECT deleted_at, sync_status FROM transfers WHERE id = ?').get(id) as {
      deleted_at: string | null;
      sync_status: string;
    };
    expect(row.deleted_at).not.toBeNull();
    expect(row.sync_status).toBe('pending');
  });
});
