import { getAccountBalance } from '@/features/finance/accounts/accounts.service';
import { query } from '@/services/database';

import type { MonthFlows, NetWorth } from './networth.types';

/**
 * Net worth and the savings rate, computed from what the user already logs
 * (VS-53). Debts and tontines are read by SQL, as wallet balances read them, so
 * this slice depends only on `accounts`.
 */

/** What is still outstanding, as of `asOf`, on live debts in `direction` dated by then. */
async function outstanding(direction: 'lent' | 'owed', asOf: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(MAX(d.amount - (
        SELECT COALESCE(SUM(p.amount), 0) FROM debt_payments p
        WHERE p.debt_id = d.id AND p.deleted_at IS NULL AND p.date <= ?), 0)), 0) AS total
     FROM debts d
     WHERE d.deleted_at IS NULL AND d.direction = ? AND d.date <= ?`,
    [asOf, direction, asOf],
  );
  return row.total;
}

/** Tontine money paid in less money received, by `asOf`, on live tontines. */
async function tontinePosition(asOf: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN p.kind = 'contribution' THEN p.amount ELSE -p.amount END), 0) AS total
     FROM tontine_payments p JOIN tontines t ON t.id = p.tontine_id
     WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL AND p.date <= ?`,
    [asOf],
  );
  return row.total;
}

/**
 * Net worth at the end of `asOf` (`YYYY-MM-DD`): active wallets' balances as of
 * that day (balance checks honoured, `accounts.getAccountBalance`), plus what is
 * still lent out, minus what is still owed, plus the tontine position. Hidden
 * wallets are left out, as they are from cash on hand.
 */
export async function getNetWorthAsOf(asOf: string): Promise<NetWorth> {
  const wallets = await query<{ id: number }>('SELECT id FROM accounts WHERE is_active = 1');
  const [balances, lent, owed, tontines] = await Promise.all([
    Promise.all(wallets.map((w) => getAccountBalance(w.id, asOf))),
    outstanding('lent', asOf),
    outstanding('owed', asOf),
    tontinePosition(asOf),
  ]);
  const walletTotal = balances.reduce((sum, b) => sum + b, 0);
  return { wallets: walletTotal, lent, owed, tontines, total: walletTotal + lent - owed + tontines };
}

/** The month's income received and spending (refunds netted out). */
export async function getMonthFlows(monthISO: string): Promise<MonthFlows> {
  const like = `${monthISO}-%`;
  const [[inRow], [outRow]] = await Promise.all([
    query<{ total: number }>('SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE date LIKE ?', [like]),
    query<{ total: number }>('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date LIKE ?', [like]),
  ]);
  return { income: inRow.total, spending: outRow.total };
}

/**
 * The share of income kept, as a whole percent: `(income − spending) ÷ income`.
 * Negative when the month spent more than came in; null without income. Pure.
 */
export function savingsRate(income: number, spending: number): number | null {
  if (income <= 0) return null;
  return Math.round(((income - spending) / income) * 100);
}
