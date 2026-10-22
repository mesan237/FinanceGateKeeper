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
  advanceDueDate,
  createRecurringExpense,
  getRecurringExpenses,
  runRecurringAutoLog,
  updateRecurringExpense,
} from '@/features/finance/expenses/expenses.service';

let sqlite: Database.Database;
const TRANSPORT = 5;

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

function taxi(nextDueDate: string) {
  return createRecurringExpense({
    label: 'Taxi to work',
    amount: 1_000,
    categoryId: TRANSPORT,
    subcategoryId: null,
    frequency: 'weekdays',
    nextDueDate,
    isActive: true,
  });
}

// 23 Oct 2026 is a Friday.
describe('weekday recurring expenses (VS-60)', () => {
  it('advances a weekday bill to the next working day', () => {
    expect(advanceDueDate('2026-10-22', 'weekdays')).toBe('2026-10-23');
    expect(advanceDueDate('2026-10-23', 'weekdays')).toBe('2026-10-26');
  });

  it('starts a weekday bill set on a weekend on the Monday', async () => {
    await taxi('2026-10-24');

    const [bill] = await getRecurringExpenses();
    expect(bill.frequency).toBe('weekdays');
    expect(bill.nextDueDate).toBe('2026-10-26');
  });

  it('rolls the date to Monday when a bill is switched to weekdays', async () => {
    const id = await createRecurringExpense({
      label: 'Taxi to work',
      amount: 1_000,
      categoryId: TRANSPORT,
      subcategoryId: null,
      frequency: 'weekly',
      nextDueDate: '2026-10-25',
      isActive: true,
    });

    await updateRecurringExpense(id, { frequency: 'weekdays' });

    const [bill] = await getRecurringExpenses();
    expect(bill.nextDueDate).toBe('2026-10-26');
  });

  it('logs one expense per working day and none at the weekend', async () => {
    await taxi('2026-10-22');

    const { loggedCount } = await runRecurringAutoLog('2026-10-27');

    const dates = sqlite
      .prepare('SELECT date FROM expenses WHERE is_recurring = 1 ORDER BY date')
      .all()
      .map((r) => (r as { date: string }).date);
    expect(loggedCount).toBe(4);
    expect(dates).toEqual(['2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27']);
    expect((await getRecurringExpenses())[0].nextDueDate).toBe('2026-10-28');
  });
});
