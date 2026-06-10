import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Per-test in-memory better-sqlite3; only the connection is swapped, the real
// migrations and queries run (no SQLite mocking). Mirrors projects.service.test.
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

describe('createDebt / getDebtById', () => {
  it('round-trips all fields including null due date and note', async () => {
    const id = await createDebt({
      personName: 'Jean',
      amount: 15000,
      direction: 'lent',
      date: '2026-06-01',
    });
    const debt = await getDebtById(id);
    expect(debt).toMatchObject({
      id,
      personName: 'Jean',
      amount: 15000,
      direction: 'lent',
      date: '2026-06-01',
      dueDate: null,
      status: 'pending',
      note: null,
      settledAt: null,
    });
  });

  it('rejects an empty person name', async () => {
    await expect(
      createDebt({ personName: '  ', amount: 15000, direction: 'lent' }),
    ).rejects.toThrow();
  });

  it('rejects a non-positive amount', async () => {
    await expect(
      createDebt({ personName: 'Jean', amount: 0, direction: 'lent' }),
    ).rejects.toThrow();
  });

  it('returns null for a missing debt', async () => {
    expect(await getDebtById(999)).toBeNull();
  });
});

describe('getDebts', () => {
  it('filters by direction and sorts pending before settled', async () => {
    const lent1 = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await createDebt({ personName: 'Awa', amount: 5000, direction: 'owed' });
    const lent2 = await createDebt({ personName: 'Paul', amount: 8000, direction: 'lent' });
    await settleDebt(lent1);

    const lent = await getDebts('lent');
    expect(lent.map((d) => d.id)).toEqual([lent2, lent1]); // pending first, settled last
    expect(lent.every((d) => d.direction === 'lent')).toBe(true);

    const owed = await getDebts('owed');
    expect(owed).toHaveLength(1);
    expect(owed[0].personName).toBe('Awa');
  });
});

describe('settleDebt', () => {
  it('flips status, stamps settled_at, and drops it from outstanding totals', async () => {
    const id = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await settleDebt(id, '2026-06-10T09:00:00.000Z');

    const debt = await getDebtById(id);
    expect(debt?.status).toBe('settled');
    expect(debt?.settledAt).toBe('2026-06-10T09:00:00.000Z');

    const totals = await getOutstandingTotals();
    expect(totals.lent).toBe(0);
  });

  it('is idempotent — settling a settled debt does not change settled_at', async () => {
    const id = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await settleDebt(id, '2026-06-10T09:00:00.000Z');
    await settleDebt(id, '2026-06-20T09:00:00.000Z');
    const debt = await getDebtById(id);
    expect(debt?.settledAt).toBe('2026-06-10T09:00:00.000Z');
  });
});

describe('getOutstandingTotals', () => {
  it('sums pending amounts per direction and ignores settled debts', async () => {
    await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await createDebt({ personName: 'Paul', amount: 8000, direction: 'lent' });
    await createDebt({ personName: 'Awa', amount: 40000, direction: 'owed' });
    const settled = await createDebt({ personName: 'Sam', amount: 99000, direction: 'owed' });
    await settleDebt(settled);

    const totals = await getOutstandingTotals();
    expect(totals).toEqual({ lent: 23000, owed: 40000 });
  });

  it('returns zeros when there are no debts', async () => {
    expect(await getOutstandingTotals()).toEqual({ lent: 0, owed: 0 });
  });
});

describe('updateDebt / deleteDebt', () => {
  it('updates the due date and note', async () => {
    const id = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await updateDebt(id, { dueDate: '2026-06-15', note: 'for the taxi' });
    const debt = await getDebtById(id);
    expect(debt?.dueDate).toBe('2026-06-15');
    expect(debt?.note).toBe('for the taxi');
  });

  it('rejects an update that blanks the person name', async () => {
    const id = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await expect(updateDebt(id, { personName: '  ' })).rejects.toThrow();
  });

  it('rejects an update to a non-positive amount', async () => {
    const id = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await expect(updateDebt(id, { amount: 0 })).rejects.toThrow();
  });

  it('rejects updating a debt that does not exist', async () => {
    await expect(updateDebt(999, { note: 'x' })).rejects.toThrow();
  });

  it('deletes a debt', async () => {
    const id = await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent' });
    await deleteDebt(id);
    expect(await getDebtById(id)).toBeNull();
  });
});

describe('getDueReminders', () => {
  const today = '2026-06-12';

  it('flags a debt due within the window as dueSoon', async () => {
    await createDebt({ personName: 'Jean', amount: 15000, direction: 'lent', dueDate: '2026-06-14' });
    const reminders = await getDueReminders(today);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ personName: 'Jean', kind: 'dueSoon', dueDate: '2026-06-14' });
  });

  it('flags a past-due debt as overdue', async () => {
    await createDebt({ personName: 'Paul', amount: 8000, direction: 'lent', dueDate: '2026-06-10' });
    const reminders = await getDueReminders(today);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ personName: 'Paul', kind: 'overdue' });
  });

  it('ignores debts due beyond the window, settled debts, and debts with no due date', async () => {
    await createDebt({ personName: 'Far', amount: 1000, direction: 'lent', dueDate: '2026-07-30' });
    await createDebt({ personName: 'NoDate', amount: 1000, direction: 'lent' });
    const settled = await createDebt({
      personName: 'Done',
      amount: 1000,
      direction: 'lent',
      dueDate: '2026-06-13',
    });
    await settleDebt(settled);

    expect(await getDueReminders(today)).toEqual([]);
  });
});
