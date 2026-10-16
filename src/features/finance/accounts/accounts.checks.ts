import i18n from 'i18next';

import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import { getAccountBalance } from './accounts.balance';
import type { BalanceCheck } from './accounts.types';

/**
 * Balance checks (VS-42): the user tells the app what a wallet actually holds,
 * and the app takes that as the new starting point instead of trusting an
 * undated opening balance plus every row ever logged. Each check records how
 * far off the app was, which is the honest measure of logging drift.
 */

interface BalanceCheckRow {
  id: number;
  account_id: number;
  balance: number;
  difference: number;
  date: string;
  note: string | null;
  created_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function mapCheck(row: BalanceCheckRow): BalanceCheck {
  return {
    id: row.id,
    accountId: row.account_id,
    balance: row.balance,
    difference: row.difference,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

/**
 * Records that wallet `accountId` actually holds `balance` on `date` (default:
 * today). The difference from what the app computed just before is stored with
 * it. A negative balance is allowed — an overdrawn card is a real state.
 *
 * @throws if `balance` is not whole FCFA or `date` is not `YYYY-MM-DD`.
 */
export async function confirmBalance(
  accountId: number,
  balance: number,
  date: string = toISODate(new Date()),
  note?: string | null,
): Promise<void> {
  if (!Number.isInteger(balance)) {
    throw new Error(i18n.t('errors.balanceWhole', { ns: 'accounts' }));
  }
  if (!ISO_DATE.test(date)) {
    throw new Error(i18n.t('errors.balanceDate', { ns: 'accounts' }));
  }
  const computed = await getAccountBalance(accountId);
  await execute(
    `INSERT INTO balance_checks (account_id, balance, difference, date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [accountId, balance, balance - computed, date, note ?? null, new Date().toISOString()],
  );
}

/** The wallet's live (not removed) balance checks, newest first. */
export async function getBalanceChecks(accountId: number): Promise<BalanceCheck[]> {
  const rows = await query<BalanceCheckRow>(
    `SELECT id, account_id, balance, difference, date, note, created_at FROM balance_checks
     WHERE account_id = ? AND deleted_at IS NULL
     ORDER BY date DESC, created_at DESC`,
    [accountId],
  );
  return rows.map(mapCheck);
}

/**
 * Removes a balance check. Soft delete: the sync engine never sends deletions,
 * so a hard-deleted check would come back on the next restore.
 */
export async function removeBalanceCheck(id: number): Promise<void> {
  await execute('UPDATE balance_checks SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    new Date().toISOString(),
    id,
  ]);
}
