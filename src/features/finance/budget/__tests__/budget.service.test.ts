import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Route the database helpers the service imports to a per-test in-memory
// better-sqlite3 instance. The SQL engine is real (no SQLite mocking) — only
// the connection is swapped, so the real migrations and queries run.
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

import { DEFAULT_ALLOCATION } from '@/constants/allocation';
import {
  calculateBreakdown,
  getAllocation,
  getExpensesMonthlyTotal,
  getMonthlyBudget,
  getOrCreateCurrentAllocation,
  lockAllocation,
  redistributeEmergencyPct,
  updateAllocation,
} from '@/features/finance/budget/budget.service';
import { createIncome } from '@/features/finance/income/income.service';
import { createExpense } from '@/features/finance/expenses/expenses.service';

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

describe('getOrCreateCurrentAllocation', () => {
  it('creates a row with DEFAULT_ALLOCATION when none exists for the month', async () => {
    const allocation = await getOrCreateCurrentAllocation('2026-06');

    expect(allocation.month).toBe('2026-06');
    expect(allocation.emergencyFundPct).toBe(DEFAULT_ALLOCATION.emergencyFundPct);
    expect(allocation.savingsPct).toBe(DEFAULT_ALLOCATION.savingsPct);
    expect(allocation.projectsPct).toBe(DEFAULT_ALLOCATION.projectsPct);
    expect(allocation.expensesPct).toBe(DEFAULT_ALLOCATION.expensesPct);
    expect(allocation.priorityOrder).toEqual([...DEFAULT_ALLOCATION.priorityOrder]);
    expect(allocation.isLocked).toBe(false);
  });

  it('is idempotent — calling twice returns the same row, not a duplicate', async () => {
    const first = await getOrCreateCurrentAllocation('2026-06');
    const second = await getOrCreateCurrentAllocation('2026-06');

    expect(second.id).toBe(first.id);
    const rows = sqlite.prepare('SELECT id FROM allocations WHERE month = ?').all('2026-06');
    expect(rows).toHaveLength(1);
  });
});

describe('getAllocation', () => {
  it('returns null when no row exists for the month', async () => {
    expect(await getAllocation('2026-07')).toBeNull();
  });

  it('returns the row when one exists', async () => {
    await getOrCreateCurrentAllocation('2026-06');
    const allocation = await getAllocation('2026-06');
    expect(allocation).not.toBeNull();
    expect(allocation?.month).toBe('2026-06');
  });
});

describe('updateAllocation validation', () => {
  beforeEach(async () => {
    await getOrCreateCurrentAllocation('2026-06');
  });

  it('rejects a draft whose percentages do not sum to 100', async () => {
    await expect(
      updateAllocation('2026-06', {
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 10,
        projectsPct: 15,
        expensesPct: 60, // sum = 95
        priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
      }),
    ).rejects.toThrow(/sum to 100/);
    // Row is unchanged.
    const allocation = await getAllocation('2026-06');
    expect(allocation?.expensesPct).toBe(DEFAULT_ALLOCATION.expensesPct);
  });

  it('rejects a negative percentage', async () => {
    await expect(
      updateAllocation('2026-06', {
        month: '2026-06',
        emergencyFundPct: -5,
        savingsPct: 20,
        projectsPct: 20,
        expensesPct: 65,
        priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
      }),
    ).rejects.toThrow(/negative|0–100|0-100/i);
  });

  it('rejects a priority order with a missing bucket', async () => {
    await expect(
      updateAllocation('2026-06', {
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 10,
        projectsPct: 15,
        expensesPct: 65,
        priorityOrder: ['savings', 'projects', 'expenses'] as never,
      }),
    ).rejects.toThrow(/priority/i);
  });

  it('rejects a priority order with a duplicate bucket', async () => {
    await expect(
      updateAllocation('2026-06', {
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 10,
        projectsPct: 15,
        expensesPct: 65,
        priorityOrder: ['emergency_fund', 'savings', 'savings', 'expenses'] as never,
      }),
    ).rejects.toThrow(/priority/i);
  });

  it('rejects any save once the month is locked', async () => {
    await lockAllocation('2026-06');
    await expect(
      updateAllocation('2026-06', {
        month: '2026-06',
        emergencyFundPct: 10,
        savingsPct: 10,
        projectsPct: 15,
        expensesPct: 65,
        priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
      }),
    ).rejects.toThrow(/locked/i);
  });

  it('writes a valid draft and a subsequent getAllocation reflects it', async () => {
    await updateAllocation('2026-06', {
      month: '2026-06',
      emergencyFundPct: 15,
      savingsPct: 20,
      projectsPct: 25,
      expensesPct: 40,
      priorityOrder: ['expenses', 'projects', 'savings', 'emergency_fund'],
    });

    const after = await getAllocation('2026-06');
    expect(after).toMatchObject({
      emergencyFundPct: 15,
      savingsPct: 20,
      projectsPct: 25,
      expensesPct: 40,
      priorityOrder: ['expenses', 'projects', 'savings', 'emergency_fund'],
    });
  });
});

describe('lockAllocation', () => {
  it('flips is_locked to true', async () => {
    await getOrCreateCurrentAllocation('2026-06');
    await lockAllocation('2026-06');

    const after = await getAllocation('2026-06');
    expect(after?.isLocked).toBe(true);
  });

  it('is idempotent — locking twice is a no-op', async () => {
    await getOrCreateCurrentAllocation('2026-06');
    await lockAllocation('2026-06');
    await expect(lockAllocation('2026-06')).resolves.toBeUndefined();
  });
});

describe('calculateBreakdown', () => {
  const defaultAllocation = {
    id: 1,
    month: '2026-06',
    emergencyFundPct: DEFAULT_ALLOCATION.emergencyFundPct,
    savingsPct: DEFAULT_ALLOCATION.savingsPct,
    projectsPct: DEFAULT_ALLOCATION.projectsPct,
    expensesPct: DEFAULT_ALLOCATION.expensesPct,
    priorityOrder: [...DEFAULT_ALLOCATION.priorityOrder],
    isLocked: false,
    createdAt: '2026-06-01T00:00:00.000Z',
  };

  it('splits 400000 FCFA correctly under the defaults', () => {
    const breakdown = calculateBreakdown(400000, defaultAllocation);
    expect(breakdown).toEqual({
      emergencyFund: 40000,
      savings: 40000,
      projects: 60000,
      expenses: 260000,
    });
  });

  it('assigns the rounding remainder to the expenses bucket', () => {
    // 100001 × 10% = 10000.1 (truncates to 10000); same for savings; projects 15001 → 15000;
    // expenses bucket absorbs the residual so the four sum to 100001.
    const breakdown = calculateBreakdown(100001, defaultAllocation);
    const sum =
      breakdown.emergencyFund +
      breakdown.savings +
      breakdown.projects +
      breakdown.expenses;
    expect(sum).toBe(100001);
    expect(breakdown.emergencyFund).toBe(10000);
    expect(breakdown.savings).toBe(10000);
    expect(breakdown.projects).toBe(15000);
    expect(breakdown.expenses).toBe(65001);
  });

  it('returns all zeros when amount is 0', () => {
    expect(calculateBreakdown(0, defaultAllocation)).toEqual({
      emergencyFund: 0,
      savings: 0,
      projects: 0,
      expenses: 0,
    });
  });
});

describe('getExpensesMonthlyTotal', () => {
  it('sums only expenses whose date is in the target month', async () => {
    // VS-03 seeds default categories (id=1 is the first parent); use it.
    await createExpense({
      amount: 5000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-05',
      isRecurring: false,
    });
    await createExpense({
      amount: 12000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-20',
      isRecurring: false,
    });
    await createExpense({
      amount: 99999,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-07-01',
      isRecurring: false,
    });

    expect(await getExpensesMonthlyTotal('2026-06')).toBe(17000);
  });

  it('returns 0 when no expenses match the month', async () => {
    expect(await getExpensesMonthlyTotal('2026-06')).toBe(0);
  });
});

describe('getMonthlyBudget', () => {
  it('composes income total, allocation, breakdown, and remaining expense budget', async () => {
    await createIncome({ amount: 350000, source: 'salary', note: null, date: '2026-06-12' });
    await createIncome({ amount: 75000, source: 'freelance', note: null, date: '2026-06-20' });
    await createExpense({
      amount: 5000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-10',
      isRecurring: false,
    });
    await createExpense({
      amount: 12000,
      categoryId: 1,
      subcategoryId: null,
      note: null,
      date: '2026-06-15',
      isRecurring: false,
    });

    const budget = await getMonthlyBudget('2026-06');
    expect(budget.incomeTotal).toBe(425000);
    // 425000 × 65% = 276250 exactly (no remainder).
    expect(budget.breakdown.expenses).toBe(276250);
    expect(budget.expensesLogged).toBe(17000);
    expect(budget.expensesRemaining).toBe(276250 - 17000);
    expect(budget.allocation.month).toBe('2026-06');
  });

  it('returns a coherent zero-income view when no income is logged yet', async () => {
    const budget = await getMonthlyBudget('2026-06');
    expect(budget.incomeTotal).toBe(0);
    expect(budget.breakdown).toEqual({
      emergencyFund: 0,
      savings: 0,
      projects: 0,
      expenses: 0,
    });
    expect(budget.expensesLogged).toBe(0);
    expect(budget.expensesRemaining).toBe(0);
  });
});

describe('redistributeEmergencyPct', () => {
  it('zeroes emergency and splits its pct proportionally, still summing to 100', async () => {
    // Default: emergency 10, savings 10, projects 15, expenses 65 (others = 90).
    await getOrCreateCurrentAllocation('2026-06');

    await redistributeEmergencyPct('2026-06');

    const a = await getAllocation('2026-06');
    expect(a?.emergencyFundPct).toBe(0);
    // floor(10*10/90)=1 → savings 11; floor(10*15/90)=1 → projects 16;
    // expenses takes the remainder → 65 + (10 - 1 - 1) = 73.
    expect(a?.savingsPct).toBe(11);
    expect(a?.projectsPct).toBe(16);
    expect(a?.expensesPct).toBe(73);
    expect(
      (a?.emergencyFundPct ?? 0) +
        (a?.savingsPct ?? 0) +
        (a?.projectsPct ?? 0) +
        (a?.expensesPct ?? 0),
    ).toBe(100);
  });

  it('is a no-op when the emergency percentage is already 0', async () => {
    await getOrCreateCurrentAllocation('2026-06');
    await redistributeEmergencyPct('2026-06');
    const once = await getAllocation('2026-06');

    await redistributeEmergencyPct('2026-06');
    const twice = await getAllocation('2026-06');

    expect(twice).toEqual(once);
  });

  it('writes through a locked allocation (the documented lock exception)', async () => {
    await getOrCreateCurrentAllocation('2026-06');
    await lockAllocation('2026-06');

    await redistributeEmergencyPct('2026-06');

    const a = await getAllocation('2026-06');
    expect(a?.isLocked).toBe(true);
    expect(a?.emergencyFundPct).toBe(0);
  });
});
