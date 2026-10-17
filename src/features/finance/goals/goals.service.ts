import i18n from 'i18next';

import { getAccountBalance } from '@/features/finance/accounts/accounts.service';
import type { goals as goalsCopy } from '@/i18n/locales/en/goals';
import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import { goalProgress } from './goals.progress';
import { GOAL_KINDS, type Goal, type GoalPatch, type GoalWithProgress, type NewGoal } from './goals.types';

/**
 * Goals storage (VS-48). A goal never stores its progress: the linked wallet's
 * live balance is the progress, so the two cannot drift apart. One wallet holds
 * at most one live goal, otherwise a single balance would count twice.
 */

interface GoalRow {
  id: number;
  name: string;
  kind: Goal['kind'];
  target_amount: number;
  target_date: string | null;
  account_id: number;
  monthly_amount: number;
  created_at: string;
}

const COLUMNS =
  'id, name, kind, target_amount, target_date, account_id, monthly_amount, created_at';

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    accountId: row.account_id,
    monthlyAmount: row.monthly_amount,
    createdAt: row.created_at,
  };
}

/** Throws the localised validation error `key`. */
function fail(key: keyof (typeof goalsCopy)['errors']): never {
  throw new Error(i18n.t(`errors.${key}`, { ns: 'goals' }));
}

/** True for a real `YYYY-MM-DD` calendar date. */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates a complete goal and returns it normalised: trimmed name, and no
 * target date on a buffer.
 *
 * @param exceptId The goal being edited, which may keep its own wallet.
 */
async function normalise(input: NewGoal, exceptId: number | null): Promise<NewGoal> {
  const name = input.name.trim();
  if (!name) fail('nameRequired');
  if (!GOAL_KINDS.includes(input.kind)) fail('kindInvalid');
  if (!Number.isInteger(input.targetAmount) || input.targetAmount <= 0) fail('targetPositive');
  if (!Number.isInteger(input.monthlyAmount) || input.monthlyAmount < 0) fail('monthlyAmount');

  const targetDate = input.kind === 'sinking' ? (input.targetDate ?? null) : null;
  if (input.kind === 'sinking' && (targetDate === null || !isValidDate(targetDate))) fail('dateRequired');

  const [wallet] = await query<{ is_active: number }>('SELECT is_active FROM accounts WHERE id = ?', [
    input.accountId,
  ]);
  if (!wallet || wallet.is_active !== 1) fail('walletInvalid');
  const [taken] = await query<{ n: number }>(
    'SELECT COUNT(*) AS n FROM goals WHERE account_id = ? AND deleted_at IS NULL AND id IS NOT ?',
    [input.accountId, exceptId],
  );
  if (taken.n > 0) fail('walletTaken');

  return { ...input, name, targetDate };
}

/**
 * Creates a goal linked to `input.accountId`.
 *
 * @returns the new goal's id.
 * @throws on a blank name, a non-positive target, a negative monthly amount, a
 *   sinking fund without a valid date, or a wallet that is hidden or already
 *   holds another goal.
 */
export async function createGoal(input: NewGoal): Promise<number> {
  const goal = await normalise(input, null);
  await execute(
    `INSERT INTO goals (name, kind, target_amount, target_date, account_id, monthly_amount, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.name,
      goal.kind,
      goal.targetAmount,
      goal.targetDate ?? null,
      goal.accountId,
      goal.monthlyAmount,
      new Date().toISOString(),
    ],
  );
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return id;
}

/** One live goal by id, or null when it does not exist or was deleted. */
export async function getGoalById(id: number): Promise<Goal | null> {
  const rows = await query<GoalRow>(`SELECT ${COLUMNS} FROM goals WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0] ? mapGoal(rows[0]) : null;
}

/**
 * Applies `patch` to a goal, validating the result as a whole.
 *
 * @throws when the goal does not exist, or for the same reasons as `createGoal`.
 */
export async function updateGoal(id: number, patch: GoalPatch): Promise<void> {
  const current = await getGoalById(id);
  if (!current) fail('notFound');
  const goal = await normalise({ ...current, ...patch }, id);
  await execute(
    `UPDATE goals SET name = ?, kind = ?, target_amount = ?, target_date = ?, account_id = ?, monthly_amount = ?
     WHERE id = ?`,
    [goal.name, goal.kind, goal.targetAmount, goal.targetDate ?? null, goal.accountId, goal.monthlyAmount, id],
  );
}

/**
 * Removes a goal (soft delete, so a restore cannot bring it back). The money
 * stays in the wallet, and the wallet is free to hold another goal.
 */
export async function deleteGoal(id: number): Promise<void> {
  await execute('UPDATE goals SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    new Date().toISOString(),
    id,
  ]);
}

/** Net transfers into `accountId` dated in the month of `todayISO`. */
async function savedThisMonth(accountId: number, todayISO: string): Promise<number> {
  const [row] = await query<{ net: number }>(
    `SELECT COALESCE(SUM(CASE WHEN to_account_id = ? THEN amount ELSE -amount END), 0) AS net
     FROM transfers
     WHERE deleted_at IS NULL AND date LIKE ? AND (to_account_id = ? OR from_account_id = ?)`,
    [accountId, `${todayISO.slice(0, 7)}-%`, accountId, accountId],
  );
  return row.net;
}

/**
 * Every live goal with its wallet's name and its progress, oldest first.
 * Progress reads the wallet's live balance (`accounts.getAccountBalance`).
 */
export async function getGoals(todayISO: string = toISODate(new Date())): Promise<GoalWithProgress[]> {
  const rows = await query<GoalRow & { account_name: string }>(
    `SELECT g.id, g.name, g.kind, g.target_amount, g.target_date, g.account_id, g.monthly_amount,
            g.created_at, a.name AS account_name
     FROM goals g JOIN accounts a ON a.id = g.account_id
     WHERE g.deleted_at IS NULL
     ORDER BY g.created_at ASC, g.id ASC`,
  );
  return Promise.all(
    rows.map(async (row) => {
      const goal = mapGoal(row);
      const [balance, saved] = await Promise.all([
        getAccountBalance(goal.accountId),
        savedThisMonth(goal.accountId, todayISO),
      ]);
      return { ...goal, accountName: row.account_name, progress: goalProgress(goal, balance, saved, todayISO) };
    }),
  );
}

/**
 * The latest monthly-essentials estimate (VS-46), offered as a starter-buffer
 * target. Read from `baseline_facts` by SQL so `goals` does not import `budget`.
 */
export async function getEssentialsEstimate(): Promise<number | null> {
  const rows = await query<{ value: number }>(
    `SELECT value FROM baseline_facts WHERE kind = 'monthly_essentials'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  );
  const value = rows[0]?.value ?? 0;
  return value > 0 ? value : null;
}
