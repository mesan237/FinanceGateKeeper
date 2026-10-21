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

import { payInstalment } from '@/features/finance/debt/debt.payments';
import { createDebt, getDueReminders } from '@/features/finance/debt/debt.service';
import { buildDebtDueAlert } from '@/notifications/triggers/debtDueDate';

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

async function scheduled(firstDate: string, frequency: 'weekly' | 'monthly' = 'monthly'): Promise<number> {
  return createDebt({
    personName: 'Microfinance',
    amount: 100_000,
    direction: 'owed',
    date: '2026-09-01',
    totalToRepay: 120_000,
    schedule: { count: 6, frequency, firstDate },
    // A stale due date must not drive a scheduled debt's reminders.
    dueDate: '2026-09-02',
  });
}

describe('instalment reminders (VS-55)', () => {
  it('reminds about the next instalment once it is within three days', async () => {
    const id = await scheduled('2026-10-23');

    expect(await getDueReminders('2026-10-21')).toEqual([
      { debtId: id, personName: 'Microfinance', amount: 20_000, dueDate: '2026-10-23', kind: 'dueSoon', instalment: 1, count: 1 },
    ]);
  });

  it('stays quiet while the next instalment is further out', async () => {
    await scheduled('2026-11-01');

    expect(await getDueReminders('2026-10-21')).toEqual([]);
  });

  it('groups the overdue instalments into one reminder, and still warns about the next one', async () => {
    const id = await scheduled('2026-10-01', 'weekly');
    await payInstalment(id, 1, null, '2026-10-01');

    // Instalments 2 (8 Oct) and 3 (15 Oct) are overdue; 4 falls on 22 Oct.
    expect(await getDueReminders('2026-10-21')).toEqual([
      { debtId: id, personName: 'Microfinance', amount: 40_000, dueDate: '2026-10-08', kind: 'overdue', instalment: 2, count: 2 },
      { debtId: id, personName: 'Microfinance', amount: 20_000, dueDate: '2026-10-22', kind: 'dueSoon', instalment: 4, count: 1 },
    ]);
  });

  it('keeps the single due date for a debt without instalments', async () => {
    const id = await createDebt({ personName: 'Awa', amount: 15_000, direction: 'owed', dueDate: '2026-10-22' });

    expect(await getDueReminders('2026-10-21')).toEqual([
      { debtId: id, personName: 'Awa', amount: 15_000, dueDate: '2026-10-22', kind: 'dueSoon' },
    ]);
  });
});

describe('buildDebtDueAlert for instalments', () => {
  it('names the instalment coming up', () => {
    const alert = buildDebtDueAlert({
      personName: 'Microfinance',
      amount: 20_000,
      dueDate: '2026-10-23',
      kind: 'dueSoon',
      instalment: 2,
      count: 1,
    });

    expect(alert.body).toMatch(/^Microfinance — instalment 2: 20 000 FCFA due on /);
  });

  it('says how many instalments are overdue', () => {
    const alert = buildDebtDueAlert({
      personName: 'Microfinance',
      amount: 40_000,
      dueDate: '2026-10-08',
      kind: 'overdue',
      instalment: 2,
      count: 2,
    });

    expect(alert.body).toBe('Microfinance — 2 instalments overdue (40 000 FCFA).');
  });
});
