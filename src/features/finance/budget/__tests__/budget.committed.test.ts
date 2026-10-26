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

import { execute, query } from '@/services/database';
import { getCommitted, getDueItems } from '@/features/finance/budget/budget.committed';
import { createTontine, payContribution } from '@/features/finance/tontines/tontines.service';

let sqlite: Database.Database;

const FOOD = 1;
const NOW = '2026-10-01T08:00:00Z';

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

async function bill(
  amount: number,
  frequency: 'monthly' | 'weekly' | 'weekdays',
  nextDue: string,
  isActive = 1,
): Promise<void> {
  await execute(
    `INSERT INTO recurring_expenses (label, amount, category_id, frequency, next_due_date, is_active, created_at)
     VALUES ('Bill', ?, ?, ?, ?, ?, ?)`,
    [amount, FOOD, frequency, nextDue, isActive, NOW],
  );
}

/** Runs an insert and returns the new row's id. */
async function insert(sql: string, params: ReadonlyArray<string | number | null>): Promise<number> {
  await execute(sql, params);
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

async function list(dueDate: string | null): Promise<number> {
  return insert('INSERT INTO planned_lists (name, created_at, due_date) VALUES (?, ?, ?)', [
    'Market',
    NOW,
    dueDate,
  ]);
}

async function item(listId: number, amount: number, plannedDate: string | null = null): Promise<number> {
  return insert(
    `INSERT INTO planned_items (list_id, name, estimated_amount, category_id, planned_date, created_at)
     VALUES (?, 'Rice', ?, ?, ?, ?)`,
    [listId, amount, FOOD, plannedDate, NOW],
  );
}

async function debt(
  amount: number,
  direction: 'owed' | 'lent',
  dueDate: string | null,
  status: 'pending' | 'settled' = 'pending',
): Promise<number> {
  return insert(
    `INSERT INTO debts (person_name, amount, direction, date, due_date, status, created_at)
     VALUES ('Awa', ?, ?, '2026-09-01', ?, ?, ?)`,
    [amount, direction, dueDate, status, NOW],
  );
}

describe('getCommitted', () => {
  it('is zero when nothing is due', async () => {
    expect(await getCommitted('2026-10')).toEqual({ recurring: 0, planned: 0, debts: 0, tontines: 0, total: 0 });
  });

  it('counts every recurring occurrence still to log by the end of the month', async () => {
    await bill(30_000, 'monthly', '2026-10-25');
    await bill(5_000, 'weekly', '2026-10-15'); // 15, 22, 29
    await bill(9_000, 'monthly', '2026-11-02'); // next month
    await bill(7_000, 'monthly', '2026-10-20', 0); // paused

    const committed = await getCommitted('2026-10');
    expect(committed.recurring).toBe(45_000);
  });

  it('counts a weekday bill once per working day left in the month (VS-60)', async () => {
    await bill(1_000, 'weekdays', '2026-10-26'); // Mon 26 – Fri 30; Sat 31 is skipped

    expect((await getCommitted('2026-10')).recurring).toBe(5_000);
  });

  it('counts open planned items due by the end of the month, by their own date or their list', async () => {
    const october = await list('2026-10-28');
    await item(october, 12_000);
    await item(october, 3_000, '2026-11-05'); // moved to next month
    const later = await list('2026-11-10');
    await item(later, 8_000, '2026-10-12'); // own date wins
    await item(later, 20_000);
    const bought = await item(october, 4_000);
    const spent = await insert(
      "INSERT INTO expenses (amount, category_id, date, created_at) VALUES (4000, ?, '2026-10-02', ?)",
      [FOOD, NOW],
    );
    await execute('UPDATE planned_items SET expense_id = ? WHERE id = ?', [spent, bought]);
    const undated = await list(null);
    await item(undated, 6_000);

    const committed = await getCommitted('2026-10');
    expect(committed.planned).toBe(20_000);
  });

  it('counts what is still owed on debts due by the end of the month, overdue included', async () => {
    const partlyPaid = await debt(50_000, 'owed', '2026-10-30');
    await execute(
      "INSERT INTO debt_payments (debt_id, amount, date, created_at) VALUES (?, 20000, '2026-10-05', ?)",
      [partlyPaid, NOW],
    );
    await debt(10_000, 'owed', '2026-09-20'); // overdue
    await debt(70_000, 'owed', '2026-11-15'); // next month
    await debt(90_000, 'lent', '2026-10-10'); // owed to the user
    await debt(15_000, 'owed', '2026-10-10', 'settled');
    await debt(25_000, 'owed', null); // no date

    const committed = await getCommitted('2026-10');
    expect(committed.debts).toBe(40_000);
  });

  it('counts unpaid tontine contributions due by the end of the month, overdue included (VS-52)', async () => {
    const id = await createTontine({
      name: 'Njangi',
      contributionAmount: 10_000,
      frequency: 'weekly',
      startDate: '2026-10-05',
      members: 10,
      accountId: 1,
    });
    await payContribution(id, 1, 1, '2026-10-05');

    // Cycles 2–4 (12, 19, 26 Oct) are unpaid; cycle 5 falls on 2 Nov.
    expect((await getCommitted('2026-10')).tontines).toBe(30_000);
  });

  it('counts only the instalments of a scheduled debt due by month end, not its whole balance (VS-54)', async () => {
    const loan = await debt(100_000, 'owed', null);
    await execute(
      `UPDATE debts SET total_to_repay = 120000, instalment_count = 6, instalment_frequency = 'monthly',
         first_instalment_date = '2026-09-15' WHERE id = ?`,
      [loan],
    );
    await execute(
      "INSERT INTO debt_payments (debt_id, amount, date, created_at, instalment) VALUES (?, 20000, '2026-09-15', ?, 1)",
      [loan, NOW],
    );

    // Instalment 2 (15 Oct) is due this month; 3–6 fall later.
    expect((await getCommitted('2026-10')).debts).toBe(20_000);
  });

  it('counts the total to repay on an unscheduled debt due this month (VS-54)', async () => {
    const loan = await debt(100_000, 'owed', '2026-10-30');
    await execute('UPDATE debts SET total_to_repay = 110000 WHERE id = ?', [loan]);

    expect((await getCommitted('2026-10')).debts).toBe(110_000);
  });

  it('adds every source into one total', async () => {
    await bill(30_000, 'monthly', '2026-10-25');
    await item(await list('2026-10-28'), 12_000);
    await debt(10_000, 'owed', '2026-10-30');
    await createTontine({ name: 'Office', contributionAmount: 5_000, frequency: 'monthly', startDate: '2026-10-30', members: 4 });

    expect((await getCommitted('2026-10')).total).toBe(57_000);
  });
});

describe('getDueItems (Next for you)', () => {
  it('lists everything due by month end, one line per payment, oldest first', async () => {
    await bill(30_000, 'monthly', '2026-10-25');
    await item(await list('2026-10-12'), 12_000);
    await debt(10_000, 'owed', '2026-09-20'); // overdue
    await createTontine({ name: 'Office', contributionAmount: 5_000, frequency: 'monthly', startDate: '2026-10-30', members: 4 });

    expect(await getDueItems('2026-10')).toEqual([
      { kind: 'debt', label: 'Awa', amount: 10_000, date: '2026-09-20' },
      { kind: 'planned', label: 'Rice', amount: 12_000, date: '2026-10-12' },
      { kind: 'recurring', label: 'Bill', amount: 30_000, date: '2026-10-25' },
      { kind: 'tontine', label: 'Office', amount: 5_000, date: '2026-10-30' },
    ]);
  });

  it('gives a recurring bill one line per occurrence left in the month', async () => {
    await bill(5_000, 'weekly', '2026-10-15');

    expect((await getDueItems('2026-10')).map((i) => i.date)).toEqual(['2026-10-15', '2026-10-22', '2026-10-29']);
  });

  it('lists the unpaid instalments of a scheduled debt, each on its own date', async () => {
    const loan = await debt(100_000, 'owed', null);
    await execute(
      `UPDATE debts SET total_to_repay = 120000, instalment_count = 6, instalment_frequency = 'monthly',
         first_instalment_date = '2026-09-15' WHERE id = ?`,
      [loan],
    );

    expect(await getDueItems('2026-10')).toEqual([
      { kind: 'debt', label: 'Awa', amount: 20_000, date: '2026-09-15' },
      { kind: 'debt', label: 'Awa', amount: 20_000, date: '2026-10-15' },
    ]);
  });

  it('leaves out a debt already repaid in full', async () => {
    const paid = await debt(10_000, 'owed', '2026-10-30');
    await execute(
      "INSERT INTO debt_payments (debt_id, amount, date, created_at) VALUES (?, 10000, '2026-10-05', ?)",
      [paid, NOW],
    );

    expect(await getDueItems('2026-10')).toEqual([]);
  });

  it('adds up to the committed total, so Home and the Budget tab agree', async () => {
    await bill(30_000, 'monthly', '2026-10-25');
    await item(await list('2026-10-28'), 12_000);
    await debt(10_000, 'owed', '2026-10-30');

    const items = await getDueItems('2026-10');
    expect(items.reduce((sum, i) => sum + i.amount, 0)).toBe((await getCommitted('2026-10')).total);
  });
});
