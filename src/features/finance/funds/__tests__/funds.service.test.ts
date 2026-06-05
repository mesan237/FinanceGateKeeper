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

import { DEFAULT_EMERGENCY_TARGET } from '@/constants/funds';
import {
  depositToFund,
  getFundByType,
  getFundProgress,
  getFundTransactions,
  getOrCreateFunds,
  updateFundTarget,
  withdrawFromFund,
} from '@/features/finance/funds/funds.service';

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

describe('getOrCreateFunds', () => {
  it('seeds one emergency fund (default target) and one savings fund (no target)', async () => {
    const funds = await getOrCreateFunds();

    const emergency = funds.find((f) => f.type === 'emergency');
    const savings = funds.find((f) => f.type === 'savings');
    expect(emergency).toBeDefined();
    expect(savings).toBeDefined();
    expect(emergency!.targetAmount).toBe(DEFAULT_EMERGENCY_TARGET);
    expect(emergency!.currentAmount).toBe(0);
    expect(emergency!.isTargetMet).toBe(false);
    expect(savings!.targetAmount).toBeNull();
  });

  it('is idempotent — calling twice returns the same rows, not duplicates', async () => {
    const first = await getOrCreateFunds();
    const second = await getOrCreateFunds();

    expect(second.map((f) => f.id).sort()).toEqual(first.map((f) => f.id).sort());
    const rows = sqlite.prepare('SELECT id FROM funds').all();
    expect(rows).toHaveLength(2);
  });
});

describe('depositToFund', () => {
  it('increases the balance and records a deposit transaction', async () => {
    await getOrCreateFunds();
    const result = await depositToFund('emergency', 100000, 'Allocation 2026-06');

    expect(result.fund.currentAmount).toBe(100000);
    const txns = await getFundTransactions(result.fund.id);
    expect(txns).toHaveLength(1);
    expect(txns[0].direction).toBe('deposit');
    expect(txns[0].amount).toBe(100000);
    expect(txns[0].reason).toBe('Allocation 2026-06');
  });

  it('rejects a zero or negative amount', async () => {
    await getOrCreateFunds();
    await expect(depositToFund('emergency', 0, 'x')).rejects.toThrow();
    await expect(depositToFund('emergency', -5, 'x')).rejects.toThrow();
  });

  it('flips is_target_met and reports targetNewlyMet only on the crossing deposit', async () => {
    await getOrCreateFunds();

    const below = await depositToFund('emergency', DEFAULT_EMERGENCY_TARGET - 1, 'x');
    expect(below.fund.isTargetMet).toBe(false);
    expect(below.targetNewlyMet).toBe(false);

    const crossing = await depositToFund('emergency', 1, 'x');
    expect(crossing.fund.isTargetMet).toBe(true);
    expect(crossing.targetNewlyMet).toBe(true);

    const after = await depositToFund('emergency', 1, 'x');
    expect(after.fund.isTargetMet).toBe(true);
    expect(after.targetNewlyMet).toBe(false);
  });

  it('never reports targetNewlyMet for a fund with no target (savings)', async () => {
    await getOrCreateFunds();
    const result = await depositToFund('savings', 999999, 'x');
    expect(result.fund.isTargetMet).toBe(false);
    expect(result.targetNewlyMet).toBe(false);
  });
});

describe('withdrawFromFund', () => {
  it('decreases the balance and records a withdrawal transaction', async () => {
    await getOrCreateFunds();
    const { fund } = await depositToFund('savings', 50000, 'x');

    const after = await withdrawFromFund(fund.id, 20000, 'Emergency expense');
    expect(after.currentAmount).toBe(30000);
    const txns = await getFundTransactions(fund.id);
    expect(txns[0].direction).toBe('withdrawal');
    expect(txns[0].reason).toBe('Emergency expense');
  });

  it('rejects a withdrawal larger than the current balance', async () => {
    await getOrCreateFunds();
    const { fund } = await depositToFund('savings', 10000, 'x');
    await expect(withdrawFromFund(fund.id, 10001, 'x')).rejects.toThrow();
  });

  it('rejects a zero or negative amount', async () => {
    await getOrCreateFunds();
    const fund = await getFundByType('savings');
    await expect(withdrawFromFund(fund.id, 0, 'x')).rejects.toThrow();
  });

  it('resets is_target_met when a withdrawal drops the emergency fund below target', async () => {
    await getOrCreateFunds();
    const met = await depositToFund('emergency', DEFAULT_EMERGENCY_TARGET, 'x');
    expect(met.fund.isTargetMet).toBe(true);

    const after = await withdrawFromFund(met.fund.id, 1, 'Used it');
    expect(after.isTargetMet).toBe(false);
  });
});

describe('getFundProgress', () => {
  it('returns the percentage toward a target', async () => {
    await getOrCreateFunds();
    const { fund } = await depositToFund('emergency', DEFAULT_EMERGENCY_TARGET / 2, 'x');
    expect(getFundProgress(fund)).toEqual({
      fundId: fund.id,
      type: 'emergency',
      current: DEFAULT_EMERGENCY_TARGET / 2,
      target: DEFAULT_EMERGENCY_TARGET,
      pct: 50,
    });
  });

  it('returns null pct for a fund with no target (savings)', async () => {
    await getOrCreateFunds();
    const fund = await getFundByType('savings');
    expect(getFundProgress(fund).pct).toBeNull();
  });
});

describe('updateFundTarget', () => {
  it('updates the savings target and allows clearing it back to null', async () => {
    await getOrCreateFunds();
    const savings = await getFundByType('savings');

    await updateFundTarget(savings.id, 250000);
    expect((await getFundByType('savings')).targetAmount).toBe(250000);

    await updateFundTarget(savings.id, null);
    expect((await getFundByType('savings')).targetAmount).toBeNull();
  });

  it('rejects a null or non-positive target for the emergency fund', async () => {
    await getOrCreateFunds();
    const emergency = await getFundByType('emergency');
    await expect(updateFundTarget(emergency.id, null)).rejects.toThrow();
    await expect(updateFundTarget(emergency.id, 0)).rejects.toThrow();
  });

  it('recomputes is_target_met when the target changes', async () => {
    await getOrCreateFunds();
    const { fund } = await depositToFund('savings', 100000, 'x');
    expect(fund.isTargetMet).toBe(false);

    await updateFundTarget(fund.id, 80000);
    expect((await getFundByType('savings')).isTargetMet).toBe(true);
  });
});
