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

import { execute } from '@/services/database';
import { createAccount, hideAccount, logTransfer } from '@/features/finance/accounts/accounts.service';
import {
  createGoal,
  deleteGoal,
  getEssentialsEstimate,
  getGoalById,
  getGoals,
  updateGoal,
} from '@/features/finance/goals/goals.service';
import type { NewGoal } from '@/features/finance/goals/goals.types';

let sqlite: Database.Database;
let savings: number;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  savings = (await createAccount({ name: 'Savings MoMo', type: 'mobile_money', purpose: 'saving' })).id;
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

function sinking(overrides: Partial<NewGoal> = {}): NewGoal {
  return {
    name: 'School fees',
    kind: 'sinking',
    targetAmount: 300_000,
    targetDate: '2027-09-01',
    accountId: savings,
    monthlyAmount: 25_000,
    ...overrides,
  };
}

describe('createGoal', () => {
  it('saves a sinking fund linked to its wallet', async () => {
    const id = await createGoal(sinking());

    expect(await getGoalById(id)).toMatchObject({
      name: 'School fees',
      kind: 'sinking',
      accountId: savings,
      targetDate: '2027-09-01',
    });
  });

  it('drops a target date from a buffer', async () => {
    const id = await createGoal(sinking({ kind: 'buffer', name: 'Buffer' }));

    expect((await getGoalById(id))?.targetDate).toBeNull();
  });

  it('rejects a blank name, a non-positive target and a negative monthly amount', async () => {
    await expect(createGoal(sinking({ name: '  ' }))).rejects.toThrow();
    await expect(createGoal(sinking({ targetAmount: 0 }))).rejects.toThrow();
    await expect(createGoal(sinking({ monthlyAmount: -1 }))).rejects.toThrow();
  });

  it('requires a valid date for a sinking fund', async () => {
    await expect(createGoal(sinking({ targetDate: null }))).rejects.toThrow();
    await expect(createGoal(sinking({ targetDate: '2027-13-40' }))).rejects.toThrow();
  });

  it('refuses a wallet that already holds another goal', async () => {
    await createGoal(sinking());

    await expect(createGoal(sinking({ name: 'Phone' }))).rejects.toThrow();
  });

  it('refuses a hidden wallet', async () => {
    await hideAccount(savings);

    await expect(createGoal(sinking())).rejects.toThrow();
  });
});

describe('updateGoal / deleteGoal', () => {
  it('edits a goal, keeping its own wallet', async () => {
    const id = await createGoal(sinking());

    await updateGoal(id, { targetAmount: 350_000, monthlyAmount: 30_000 });

    expect(await getGoalById(id)).toMatchObject({
      targetAmount: 350_000,
      monthlyAmount: 30_000,
      accountId: savings,
    });
  });

  it('soft-deletes a goal and frees its wallet', async () => {
    const id = await createGoal(sinking());

    await deleteGoal(id);

    expect(await getGoalById(id)).toBeNull();
    expect(await getGoals()).toEqual([]);
    await expect(createGoal(sinking({ name: 'Phone' }))).resolves.toBeGreaterThan(0);
  });
});

describe('getGoals', () => {
  it('reads progress from the linked wallet and what moved in this month', async () => {
    await createGoal(sinking());
    await logTransfer(1, savings, 50_000, '2026-09-20');
    await logTransfer(1, savings, 30_000, '2026-10-05');
    await logTransfer(savings, 1, 5_000, '2026-10-09');

    const [goal] = await getGoals('2026-10-17');

    expect(goal.accountName).toBe('Savings MoMo');
    expect(goal.progress.saved).toBe(75_000);
    expect(goal.progress.savedThisMonth).toBe(25_000);
    expect(goal.progress.monthsLeft).toBe(11);
  });
});

describe('getEssentialsEstimate', () => {
  it('returns the latest monthly essentials estimate, or null', async () => {
    expect(await getEssentialsEstimate()).toBeNull();

    await execute(
      `INSERT INTO baseline_facts (kind, value, source, created_at)
       VALUES ('monthly_essentials', 120000, 'user', '2026-10-01T08:00:00Z')`,
    );

    expect(await getEssentialsEstimate()).toBe(120_000);
  });
});
