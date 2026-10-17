import { getAccountBalance } from '@/features/finance/accounts/accounts.service';
import { query } from '@/services/database';
import { nextMonthISO } from '@/utils/monthMath';

/**
 * What the budget needs from goals (VS-49), read from the `goals` table by SQL
 * so `budget` gains no dependency on the `goals` slice — the same way wallet
 * balances read debts.
 *
 * Pay yourself first: each goal's monthly amount is taken out of the month's
 * total before the envelopes share out the rest. Goal money lives in the
 * goal's wallet, so it is not safe to spend.
 */

/**
 * The goals' monthly amounts for `monthISO`: every goal live at some point in
 * the month — created before it ended, and not deleted before it began.
 * Deleting a goal therefore leaves the months it was live untouched. A goal
 * that is already reached keeps its amount until the user changes it; the goal
 * card says so.
 */
export async function getGoalSetAside(monthISO: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(monthly_amount), 0) AS total FROM goals
     WHERE created_at < ? AND (deleted_at IS NULL OR deleted_at >= ?)`,
    [`${nextMonthISO(monthISO)}-01`, `${monthISO}-01`],
  );
  return row.total;
}

/**
 * Cash held in the wallets of live goals — the part of cash on hand that is
 * already promised to a goal. Hidden wallets are left out, as they are from
 * cash on hand, so the two always subtract cleanly.
 */
export async function getGoalCash(): Promise<number> {
  const rows = await query<{ account_id: number }>(
    `SELECT DISTINCT g.account_id FROM goals g JOIN accounts a ON a.id = g.account_id
     WHERE g.deleted_at IS NULL AND a.is_active = 1`,
  );
  const balances = await Promise.all(rows.map((r) => getAccountBalance(r.account_id)));
  return balances.reduce((sum, balance) => sum + balance, 0);
}
