import i18n from 'i18next';

import { execute, query } from '@/services/database';
import { daysBetween, toISODate } from '@/utils/formatDate';

import { getAccountBalance } from './accounts.balance';
import type { BalanceCheck, BalanceFreshness } from './accounts.types';

/** Days after which a confirmed balance counts as old (UX-21). */
export const FRESH_DAYS = 30;

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
 * How recently every active wallet's balance was confirmed (UX-21): the oldest
 * of their latest live checks, so a figure built on all wallets is only as
 * fresh as the wallet checked longest ago. Stale when a wallet was never
 * confirmed or that check is more than {@link FRESH_DAYS} days old. Hidden
 * wallets are left out; with none active there is nothing to confirm.
 *
 * @param todayISO `YYYY-MM-DD`, explicit for testability.
 */
export async function getBalanceFreshness(todayISO: string): Promise<BalanceFreshness> {
  const rows = await query<{ last: string | null }>(
    `SELECT (SELECT MAX(bc.date) FROM balance_checks bc
             WHERE bc.account_id = a.id AND bc.deleted_at IS NULL) AS last
     FROM accounts a WHERE a.is_active = 1`,
  );
  const unchecked = rows.filter((r) => r.last === null).length;
  if (rows.length === 0) return { checkedOn: null, daysSince: null, unchecked: 0, stale: false };
  if (unchecked > 0) return { checkedOn: null, daysSince: null, unchecked, stale: true };

  const checkedOn = rows.map((r) => r.last as string).sort()[0];
  const daysSince = daysBetween(checkedOn, todayISO);
  return { checkedOn, daysSince, unchecked: 0, stale: daysSince > FRESH_DAYS };
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
