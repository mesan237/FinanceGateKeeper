import { DEFAULT_EMERGENCY_TARGET, type FundType } from '@/constants/funds';
import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import type { DepositResult, Fund, FundProgress, FundTransaction } from './funds.types';

interface FundRow {
  id: number;
  type: FundType;
  target_amount: number | null;
  current_amount: number;
  is_target_met: number;
  created_at: string;
}

interface FundTransactionRow {
  id: number;
  fund_id: number;
  amount: number;
  direction: 'deposit' | 'withdrawal';
  reason: string | null;
  date: string;
  created_at: string;
}

const FUND_COLUMNS = 'id, type, target_amount, current_amount, is_target_met, created_at';
const TXN_COLUMNS = 'id, fund_id, amount, direction, reason, date, created_at';

function mapFund(row: FundRow): Fund {
  return {
    id: row.id,
    type: row.type,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    isTargetMet: row.is_target_met === 1,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: FundTransactionRow): FundTransaction {
  return {
    id: row.id,
    fundId: row.fund_id,
    amount: row.amount,
    direction: row.direction,
    reason: row.reason,
    date: row.date,
    createdAt: row.created_at,
  };
}

/** True when a fund with `target` reaches or exceeds it. Untargeted funds never "meet". */
function targetMet(current: number, target: number | null): boolean {
  return target !== null && current >= target;
}

/**
 * Ensures both funds exist and returns them. The emergency fund is seeded with
 * `DEFAULT_EMERGENCY_TARGET`; savings is seeded with no target. Idempotent and
 * race-safe via `INSERT OR IGNORE` against the `UNIQUE(type)` constraint — a
 * second call returns the same two rows instead of inserting duplicates
 * (mirrors `getOrCreateCurrentAllocation`).
 */
export async function getOrCreateFunds(): Promise<Fund[]> {
  const now = new Date().toISOString();
  await execute(
    `INSERT OR IGNORE INTO funds (type, target_amount, current_amount, is_target_met, created_at)
     VALUES ('emergency', ?, 0, 0, ?)`,
    [DEFAULT_EMERGENCY_TARGET, now],
  );
  await execute(
    `INSERT OR IGNORE INTO funds (type, target_amount, current_amount, is_target_met, created_at)
     VALUES ('savings', NULL, 0, 0, ?)`,
    [now],
  );
  const rows = await query<FundRow>(`SELECT ${FUND_COLUMNS} FROM funds ORDER BY id`);
  return rows.map(mapFund);
}

/** Reads the fund of a given `type`, creating both funds first if needed. */
export async function getFundByType(type: FundType): Promise<Fund> {
  await getOrCreateFunds();
  const rows = await query<FundRow>(`SELECT ${FUND_COLUMNS} FROM funds WHERE type = ?`, [type]);
  if (!rows[0]) {
    // getOrCreateFunds guarantees the row exists; a miss means a broken connection.
    throw new Error(`Fund of type ${type} could not be retrieved after upsert.`);
  }
  return mapFund(rows[0]);
}

/** Reads a fund by id, or `null` if no such row exists. */
export async function getFundById(id: number): Promise<Fund | null> {
  const rows = await query<FundRow>(`SELECT ${FUND_COLUMNS} FROM funds WHERE id = ?`, [id]);
  return rows[0] ? mapFund(rows[0]) : null;
}

/** Reads a fund by id, throwing if it does not exist. Internal helper. */
async function requireFund(id: number): Promise<Fund> {
  const fund = await getFundById(id);
  if (!fund) throw new Error(`Fund ${id} does not exist.`);
  return fund;
}

/**
 * Deposits `amount` (FCFA) into the fund of `type`, recording a `deposit`
 * transaction and recomputing `is_target_met`. The transaction row, the balance
 * update, and the flag update run in a single SQLite transaction so a crash
 * can't leave the audit trail disagreeing with the balance (mirrors
 * `runRecurringAutoLog`).
 *
 * @returns the updated fund and whether this deposit *first* met the target,
 * so the caller can trigger redistribution exactly once.
 */
export async function depositToFund(
  type: FundType,
  amount: number,
  reason: string,
  dateISO: string = toISODate(new Date()),
): Promise<DepositResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Deposit amount must be a positive integer.');
  }
  const fund = await getFundByType(type);
  const newAmount = fund.currentAmount + amount;
  const nowMet = targetMet(newAmount, fund.targetAmount);
  const targetNewlyMet = nowMet && !fund.isTargetMet;

  await execute('BEGIN TRANSACTION');
  try {
    await execute(
      `INSERT INTO fund_transactions (fund_id, amount, direction, reason, date, created_at)
       VALUES (?, ?, 'deposit', ?, ?, ?)`,
      [fund.id, amount, reason, dateISO, new Date().toISOString()],
    );
    await execute('UPDATE funds SET current_amount = ?, is_target_met = ? WHERE id = ?', [
      newAmount,
      nowMet ? 1 : 0,
      fund.id,
    ]);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }

  return { fund: await requireFund(fund.id), targetNewlyMet };
}

/**
 * Withdraws `amount` (FCFA) from the fund `id`, recording a `withdrawal`
 * transaction and re-deriving `is_target_met` from the new balance (a drop
 * below target resets the flag). Rejects a non-positive amount or an
 * over-withdrawal — funds never go negative. Single SQLite transaction.
 */
export async function withdrawFromFund(
  id: number,
  amount: number,
  reason: string,
  dateISO: string = toISODate(new Date()),
): Promise<Fund> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Withdrawal amount must be a positive integer.');
  }
  const fund = await requireFund(id);
  if (amount > fund.currentAmount) {
    throw new Error('Withdrawal exceeds the fund balance.');
  }
  const newAmount = fund.currentAmount - amount;
  const nowMet = targetMet(newAmount, fund.targetAmount);

  await execute('BEGIN TRANSACTION');
  try {
    await execute(
      `INSERT INTO fund_transactions (fund_id, amount, direction, reason, date, created_at)
       VALUES (?, ?, 'withdrawal', ?, ?, ?)`,
      [fund.id, amount, reason, dateISO, new Date().toISOString()],
    );
    await execute('UPDATE funds SET current_amount = ?, is_target_met = ? WHERE id = ?', [
      newAmount,
      nowMet ? 1 : 0,
      fund.id,
    ]);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }

  return requireFund(fund.id);
}

/**
 * Sets a fund's target. The emergency fund's target is mandatory — a `null` or
 * non-positive value is rejected; savings may be cleared to `null`.
 * Re-derives `is_target_met` against the new target.
 */
export async function updateFundTarget(id: number, target: number | null): Promise<void> {
  const fund = await requireFund(id);
  if (fund.type === 'emergency' && (target === null || !Number.isInteger(target) || target <= 0)) {
    throw new Error('The emergency fund requires a positive target.');
  }
  if (target !== null && (!Number.isInteger(target) || target <= 0)) {
    throw new Error('A fund target must be a positive integer or null.');
  }
  const nowMet = targetMet(fund.currentAmount, target);
  await execute('UPDATE funds SET target_amount = ?, is_target_met = ? WHERE id = ?', [
    target,
    nowMet ? 1 : 0,
    id,
  ]);
}

/**
 * Pure progress calculation. `pct` is `null` when the fund has no target; with
 * a target it's `round(current / target * 100)` (can exceed 100 if overfunded —
 * the progress bar clamps the displayed width).
 */
export function getFundProgress(fund: Fund): FundProgress {
  return {
    fundId: fund.id,
    type: fund.type,
    current: fund.currentAmount,
    target: fund.targetAmount,
    pct: fund.targetAmount ? Math.round((fund.currentAmount / fund.targetAmount) * 100) : null,
  };
}

/** Returns a fund's transactions, newest first. */
export async function getFundTransactions(fundId: number): Promise<FundTransaction[]> {
  const rows = await query<FundTransactionRow>(
    `SELECT ${TXN_COLUMNS} FROM fund_transactions WHERE fund_id = ? ORDER BY id DESC`,
    [fundId],
  );
  return rows.map(mapTransaction);
}
