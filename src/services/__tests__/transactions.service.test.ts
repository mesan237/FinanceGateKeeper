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

function insertExpense(
  amount: number,
  categoryId: number,
  date: string,
  subcategoryId?: number,
  note?: string,
): number {
  const stmt = sqlite.prepare(
    `INSERT INTO expenses (amount, category_id, subcategory_id, note, date, is_recurring, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
  );
  const result = stmt.run(amount, categoryId, subcategoryId ?? null, note ?? null, date, new Date().toISOString());
  return result.lastInsertRowid as number;
}

function insertIncome(amount: number, source: string, date: string, note?: string): number {
  const stmt = sqlite.prepare(
    `INSERT INTO income (amount, source, note, date, created_at) VALUES (?, ?, ?, ?, ?)`,
  );
  const result = stmt.run(amount, source, note ?? null, date, new Date().toISOString());
  return result.lastInsertRowid as number;
}

function insertTransfer(fromId: number, toId: number, amount: number, date: string): number {
  const stmt = sqlite.prepare(
    `INSERT INTO transfers (from_account_id, to_account_id, amount, date, note, created_at)
     VALUES (?, ?, ?, ?, NULL, ?)`,
  );
  const result = stmt.run(fromId, toId, amount, date, new Date().toISOString());
  return result.lastInsertRowid as number;
}

function setExpenseAccount(expenseId: number, accountId: number): void {
  sqlite.prepare('UPDATE expenses SET account_id = ? WHERE id = ?').run(accountId, expenseId);
}

describe('getTransactionFeed — accounts & transfers (VS-18)', () => {
  it('includes transfers with a transfer type and both account names', async () => {
    insertTransfer(1, 2, 3000, '2026-06-11'); // Cash -> MTN MoMo (seeded ids 1, 2)

    const entries = await getTransactionFeed('2026-06');
    const transfer = entries.find((e) => e.type === 'transfer');
    expect(transfer).toBeTruthy();
    if (transfer && transfer.type === 'transfer') {
      expect(transfer.amount).toBe(3000);
      expect(transfer.fromAccountName).toBe('Cash');
      expect(transfer.toAccountName).toBe('MTN MoMo');
    }
  });

  it('resolves the account label for rows with an account_id, null for legacy rows', async () => {
    const withAccount = insertExpense(1000, 1, '2026-06-10');
    setExpenseAccount(withAccount, 1); // Cash
    insertExpense(500, 1, '2026-06-09'); // legacy, account_id stays null

    const entries = await getTransactionFeed('2026-06');
    const withChip = entries.find((e) => e.type === 'expense' && e.id === withAccount);
    const legacy = entries.find((e) => e.type === 'expense' && e.id !== withAccount);
    expect(withChip && withChip.type === 'expense' && withChip.accountLabel).toBe('Cash');
    expect(legacy && legacy.type === 'expense' && legacy.accountLabel).toBeNull();
  });
});

describe('getTransactionFeed', () => {
  it('returns income and expense rows merged, newest-first', async () => {
    insertExpense(1000, 1, '2026-06-10');
    insertIncome(50000, 'salary', '2026-06-12');
    insertExpense(500, 1, '2026-06-08');

    const entries = await getTransactionFeed('2026-06');

    expect(entries).toHaveLength(3);
    expect(entries[0].date).toBe('2026-06-12');
    expect(entries[1].date).toBe('2026-06-10');
    expect(entries[2].date).toBe('2026-06-08');
  });

  it('expense rows carry type "expense", income rows carry type "income"', async () => {
    insertExpense(1000, 1, '2026-06-10');
    insertIncome(50000, 'salary', '2026-06-10');

    const entries = await getTransactionFeed('2026-06');

    const types = entries.map((e) => e.type).sort();
    expect(types).toEqual(['expense', 'income']);
  });

  it('each expense row has categoryLabel resolved from the categories JOIN', async () => {
    insertExpense(2000, 1, '2026-06-10');

    const entries = await getTransactionFeed('2026-06');

    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('expense');
    if (entries[0].type === 'expense') {
      expect(entries[0].categoryLabel).toBe('Food');
    }
  });

  it('rows are scoped to the given monthISO; rows from other months are excluded', async () => {
    insertExpense(1000, 1, '2026-06-10');
    insertExpense(2000, 1, '2026-07-01');
    insertIncome(50000, 'salary', '2026-05-30');

    const entries = await getTransactionFeed('2026-06');

    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe('2026-06-10');
  });

  it('returns [] for a month with no data', async () => {
    const entries = await getTransactionFeed('2025-01');
    expect(entries).toEqual([]);
  });

  it('income sourceLabel is the human-readable string', async () => {
    insertIncome(50000, 'salary', '2026-06-10');
    insertIncome(30000, 'freelance', '2026-06-09');
    insertIncome(20000, 'ecommerce', '2026-06-08');

    const entries = await getTransactionFeed('2026-06');

    expect(entries).toHaveLength(3);
    const labels = entries.map((e) => (e.type === 'income' ? e.sourceLabel : null));
    expect(labels).toEqual(['Salary', 'Freelance', 'E-commerce']);
  });

  it('ties on same date are broken by id DESC (newest insert first)', async () => {
    const id1 = insertExpense(100, 1, '2026-06-10');
    const id2 = insertExpense(200, 1, '2026-06-10');

    const entries = await getTransactionFeed('2026-06');

    expect(entries[0].id).toBe(id2);
    expect(entries[1].id).toBe(id1);
  });
});
