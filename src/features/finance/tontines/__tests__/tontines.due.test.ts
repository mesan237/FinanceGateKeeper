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

import { getDueContributions } from '@/features/finance/tontines/tontines.due';
import { createTontine, deleteTontine, payContribution } from '@/features/finance/tontines/tontines.service';

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

describe('getDueContributions (VS-52)', () => {
  it('lists every unpaid contribution due by the date, overdue included, oldest first', async () => {
    const id = await createTontine({
      name: 'Njangi',
      contributionAmount: 10_000,
      frequency: 'weekly',
      startDate: '2026-10-05',
      members: 5,
      payoutTurn: 3,
      accountId: 1,
    });
    await payContribution(id, 1, 1, '2026-10-05');

    const due = await getDueContributions('2026-10-31');

    expect(due).toEqual([
      { tontineId: id, tontineName: 'Njangi', cycle: 2, dueDate: '2026-10-12', amount: 10_000 },
      { tontineId: id, tontineName: 'Njangi', cycle: 3, dueDate: '2026-10-19', amount: 10_000 },
      { tontineId: id, tontineName: 'Njangi', cycle: 4, dueDate: '2026-10-26', amount: 10_000 },
    ]);
  });

  it('spans every live tontine and leaves deleted ones out', async () => {
    const monthly = await createTontine({
      name: 'Office',
      contributionAmount: 25_000,
      frequency: 'monthly',
      startDate: '2026-10-30',
      members: 6,
    });
    const gone = await createTontine({
      name: 'Old',
      contributionAmount: 5_000,
      frequency: 'weekly',
      startDate: '2026-10-01',
      members: 4,
    });
    await deleteTontine(gone);

    const due = await getDueContributions('2026-10-31');

    expect(due).toEqual([{ tontineId: monthly, tontineName: 'Office', cycle: 1, dueDate: '2026-10-30', amount: 25_000 }]);
  });
});
