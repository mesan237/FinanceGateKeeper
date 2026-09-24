import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Per-test in-memory better-sqlite3; only the connection is swapped, the real
// migrations and queries run (no SQLite mocking). Mirrors debt.service.test.
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

import { execute } from '@/services/database';
import {
  createAccount,
  getAccountBalance,
  getAccountById,
  getAccountStats,
  getAccounts,
  getTransfers,
  hideAccount,
  logTransfer,
  setDefaultAccount,
  updateAccount,
} from '@/features/finance/accounts/accounts.service';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  // Seed a fund (id 1) and project (id 1) so the fund_transactions /
  // project_transactions FK references in the balance scenarios resolve.
  await execute(
    `INSERT INTO funds (type, target_amount, current_amount, is_target_met, created_at)
     VALUES ('emergency', 500000, 0, 0, '2026-06-01T00:00:00Z')`,
  );
  await execute(
    `INSERT INTO projects (name, target_amount, funded_amount, priority_rank, status, created_at)
     VALUES ('Test Project', 100000, 0, 1, 'active', '2026-06-01T00:00:00Z')`,
  );
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

// --- raw inserts into the money-movement tables (consumer services gain
// account_id in M8; here we set it directly to build balance scenarios) ---

async function insertIncome(amount: number, accountId: number | null, date = '2026-06-10') {
  await execute(
    `INSERT INTO income (amount, source, note, date, account_id, created_at)
     VALUES (?, 'salary', NULL, ?, ?, '2026-06-10T00:00:00Z')`,
    [amount, date, accountId],
  );
}

async function insertExpense(amount: number, accountId: number | null, date = '2026-06-10') {
  await execute(
    `INSERT INTO expenses (amount, category_id, subcategory_id, note, date, is_recurring, account_id, created_at)
     VALUES (?, 1, NULL, NULL, ?, 0, ?, '2026-06-10T00:00:00Z')`,
    [amount, date, accountId],
  );
}

async function insertFundTx(
  amount: number,
  direction: 'deposit' | 'withdrawal',
  accountId: number | null,
) {
  await execute(
    `INSERT INTO fund_transactions (fund_id, amount, direction, reason, date, account_id, created_at)
     VALUES (1, ?, ?, 'test', '2026-06-10', ?, '2026-06-10T00:00:00Z')`,
    [amount, direction, accountId],
  );
}

async function insertProjectTx(
  amount: number,
  source: 'allocation' | 'manual',
  accountId: number | null,
) {
  await execute(
    `INSERT INTO project_transactions (project_id, amount, date, source, account_id, created_at)
     VALUES (1, ?, '2026-06-10', ?, ?, '2026-06-10T00:00:00Z')`,
    [amount, source, accountId],
  );
}

describe('migration seed', () => {
  it('seeds Cash, MTN MoMo, Orange Money with the right type/purpose and a single default', async () => {
    const accounts = await getAccounts();
    expect(accounts.map((a) => a.name)).toEqual(
      expect.arrayContaining(['Cash', 'MTN MoMo', 'Orange Money']),
    );
    const cash = accounts.find((a) => a.name === 'Cash')!;
    expect(cash).toMatchObject({ type: 'cash', purpose: 'spending', isDefault: true });
    const mtn = accounts.find((a) => a.name === 'MTN MoMo')!;
    expect(mtn).toMatchObject({ type: 'mobile_money', purpose: 'general', isDefault: false });
    expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
  });
});

describe('getAccountBalance', () => {
  it('sums income credits, expense debits, transfers in/out, manual fund + project debits', async () => {
    // account 1 = Cash. opening 0.
    await insertIncome(10000, 1);
    await insertExpense(3000, 1);
    await logTransfer(1, 2, 2000, '2026-06-10'); // -2000 from account 1
    await logTransfer(2, 1, 500, '2026-06-10'); // +500 to account 1
    await insertFundTx(1000, 'deposit', 1); // -1000
    await insertProjectTx(800, 'manual', 1); // -800

    // 0 + 10000 - 3000 - 2000 + 500 - 1000 - 800 = 3700
    expect(await getAccountBalance(1)).toBe(3700);
  });

  it('excludes automated allocation deposits and legacy null-account rows', async () => {
    await insertIncome(5000, 1);
    await insertExpense(1000, null); // legacy expense, no wallet
    await insertFundTx(2000, 'deposit', null); // automated allocation deposit
    await insertProjectTx(1500, 'allocation', null); // automated cascade funding

    expect(await getAccountBalance(1)).toBe(5000);
  });

  it('starts from the opening balance', async () => {
    const acc = await createAccount({ name: 'Bank', type: 'bank', purpose: 'saving', openingBalance: 50000 });
    expect(await getAccountBalance(acc.id)).toBe(50000);
    await insertExpense(8000, acc.id);
    expect(await getAccountBalance(acc.id)).toBe(42000);
  });
});

describe('getAccountBalance — the parked funds/projects tables (VS-34)', () => {
  // VS-34 removed the funds and projects slices from the app but deliberately
  // left their tables in the schema, because a migration would invalidate every
  // existing export file. These tests pin the consequence that made that choice
  // safe: a wallet whose history includes fund deposits and manual project
  // contributions still reports the same balance, even though no slice code
  // reads those tables any more. If a future change drops the tables, these
  // fail before anyone's balance silently shifts.

  it('still subtracts historical fund deposits and manual project contributions', async () => {
    await insertIncome(100_000, 1);
    await insertFundTx(30_000, 'deposit', 1);
    await insertProjectTx(20_000, 'manual', 1);

    expect(await getAccountBalance(1)).toBe(50_000);
  });

  it('keeps both tables in the schema after every migration has run', async () => {
    const tables = sqlite
      .prepare(
        `SELECT name FROM sqlite_master
          WHERE type = 'table' AND name IN ('funds', 'fund_transactions', 'projects', 'project_transactions')
          ORDER BY name`,
      )
      .all() as { name: string }[];

    expect(tables.map((t) => t.name)).toEqual([
      'fund_transactions',
      'funds',
      'project_transactions',
      'projects',
    ]);
  });

  it('is unaffected by a withdrawal or an allocation-sourced row', async () => {
    // Only manual, wallet-attributed outflows ever moved real money out of a
    // wallet. A withdrawal returns money to no wallet, and an allocation-sourced
    // contribution was funded by the split, not by spending from an account.
    await insertIncome(100_000, 1);
    await insertFundTx(30_000, 'withdrawal', 1);
    await insertProjectTx(20_000, 'allocation', 1);

    expect(await getAccountBalance(1)).toBe(100_000);
  });
});

describe('logTransfer / getTransfers', () => {
  it('creates a transfer row', async () => {
    const t = await logTransfer(1, 2, 2500, '2026-06-09', 'top up');
    expect(t).toMatchObject({ fromAccountId: 1, toAccountId: 2, amount: 2500, note: 'top up' });
    const transfers = await getTransfers('2026-06');
    expect(transfers).toHaveLength(1);
    expect(transfers[0].amount).toBe(2500);
  });

  it('rejects a transfer to the same account', async () => {
    await expect(logTransfer(1, 1, 1000, '2026-06-09')).rejects.toThrow();
  });

  it('rejects a non-positive amount', async () => {
    await expect(logTransfer(1, 2, 0, '2026-06-09')).rejects.toThrow();
    await expect(logTransfer(1, 2, -5, '2026-06-09')).rejects.toThrow();
  });

  it('debits the from-account and credits the to-account', async () => {
    const beforeFrom = await getAccountBalance(1);
    const beforeTo = await getAccountBalance(2);
    await logTransfer(1, 2, 3000, '2026-06-09');
    expect(await getAccountBalance(1)).toBe(beforeFrom - 3000);
    expect(await getAccountBalance(2)).toBe(beforeTo + 3000);
  });
});

describe('getAccountStats', () => {
  it('returns each account share of the month income/expense totals', async () => {
    await insertIncome(8000, 1);
    await insertIncome(2000, 2);
    await insertExpense(3000, 1);
    await insertExpense(1000, 2);

    const stats = await getAccountStats(1, '2026-06');
    expect(stats.totalIncome).toBe(8000);
    expect(stats.totalExpenses).toBe(3000);
    expect(stats.incomePercent).toBe(80); // 8000 / 10000
    expect(stats.expensePercent).toBe(75); // 3000 / 4000
  });

  it('reports 0% when the month has no activity', async () => {
    const stats = await getAccountStats(1, '2026-06');
    expect(stats.incomePercent).toBe(0);
    expect(stats.expensePercent).toBe(0);
  });
});

describe('setDefaultAccount', () => {
  it('clears the previous default before setting the new one', async () => {
    await setDefaultAccount(2);
    const accounts = await getAccounts();
    expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
    expect(accounts.find((a) => a.isDefault)!.id).toBe(2);
  });
});

describe('hideAccount', () => {
  it('removes the account from getAccounts but preserves its history', async () => {
    await insertExpense(4000, 2);
    await hideAccount(2);
    const active = await getAccounts();
    expect(active.find((a) => a.id === 2)).toBeUndefined();
    // history still resolves: balance reflects the kept rows.
    expect(await getAccountBalance(2)).toBe(-4000);
    // the row itself still exists (soft-delete, not hard-delete).
    expect(await getAccountById(2)).not.toBeNull();
  });
});

describe('createAccount / updateAccount', () => {
  it('defaults opening balance to 0 when omitted', async () => {
    const acc = await createAccount({ name: 'Wave', type: 'mobile_money', purpose: 'general' });
    expect(acc.openingBalance).toBe(0);
  });

  it('rejects an empty name', async () => {
    await expect(
      createAccount({ name: '   ', type: 'cash', purpose: 'general' }),
    ).rejects.toThrow();
  });

  it('clears other defaults when created as default', async () => {
    const acc = await createAccount({
      name: 'Salary Bank',
      type: 'bank',
      purpose: 'general',
      isDefault: true,
    });
    const accounts = await getAccounts();
    expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
    expect(accounts.find((a) => a.isDefault)!.id).toBe(acc.id);
  });

  it('updates editable fields', async () => {
    await updateAccount(3, { name: 'Orange Money CI', purpose: 'saving' });
    const acc = await getAccountById(3);
    expect(acc).toMatchObject({ name: 'Orange Money CI', purpose: 'saving' });
  });
});
