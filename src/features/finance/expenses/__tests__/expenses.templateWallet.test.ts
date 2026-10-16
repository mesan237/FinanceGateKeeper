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
  createQuickAddTemplate,
  createRecurringExpense,
  getAllExpenses,
  getQuickAddTemplates,
  getRecurringExpenses,
  logFromQuickAddTemplate,
  runRecurringAutoLog,
  updateQuickAddTemplate,
  updateRecurringExpense,
} from '@/features/finance/expenses/expenses.service';

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
const MOMO = 2;

describe('quick-add templates carry a wallet (VS-42)', () => {
  it('stores the wallet and logs each tap against it', async () => {
    const id = await createQuickAddTemplate({
      label: 'Taxi',
      amount: 500,
      categoryId: 1,
      subcategoryId: null,
      accountId: MOMO,
    });

    expect((await getQuickAddTemplates())[0].accountId).toBe(MOMO);

    await logFromQuickAddTemplate(id, '2026-10-15');
    expect((await getAllExpenses())[0].accountId).toBe(MOMO);
  });

  it('keeps a template without a wallet unassigned rather than guessing one', async () => {
    const id = await createQuickAddTemplate({ label: 'Snack', amount: 300, categoryId: 1, subcategoryId: null });

    await logFromQuickAddTemplate(id, '2026-10-15');
    expect((await getAllExpenses())[0].accountId).toBeNull();
  });

  it('changes or clears the wallet on update', async () => {
    const id = await createQuickAddTemplate({ label: 'Taxi', amount: 500, categoryId: 1, subcategoryId: null });

    await updateQuickAddTemplate(id, { accountId: MOMO });
    expect((await getQuickAddTemplates())[0].accountId).toBe(MOMO);

    await updateQuickAddTemplate(id, { accountId: null });
    expect((await getQuickAddTemplates())[0].accountId).toBeNull();
  });
});

describe('recurring expenses carry a wallet (VS-42)', () => {
  const RENT = {
    label: 'Rent',
    amount: 100_000,
    categoryId: 1,
    subcategoryId: null,
    frequency: 'monthly' as const,
    nextDueDate: '2026-09-01',
    isActive: true,
  };

  it('auto-logs every due occurrence against the wallet', async () => {
    await createRecurringExpense({ ...RENT, accountId: MOMO });

    await runRecurringAutoLog('2026-10-15');

    const logged = await getAllExpenses();
    expect(logged).toHaveLength(2);
    expect(logged.every((e) => e.accountId === MOMO)).toBe(true);
  });

  it('changes the wallet on update, for occurrences logged afterwards', async () => {
    const id = await createRecurringExpense(RENT);
    expect((await getRecurringExpenses())[0].accountId).toBeNull();

    await updateRecurringExpense(id, { accountId: MOMO });
    expect((await getRecurringExpenses())[0].accountId).toBe(MOMO);
  });
});
