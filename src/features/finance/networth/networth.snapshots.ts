import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';
import { lastDayOfMonth, nextMonthISO, prevMonthISO } from '@/utils/monthMath';

import { getMonthFlows, getNetWorthAsOf, savingsRate } from './networth.compute';
import type { MonthSnapshot } from './networth.types';

/** How many closed months back the first run fills in. */
export const SNAPSHOT_LOOKBACK = 24;

/**
 * Month-end snapshots (VS-53): each closed month's net worth and flows stored
 * once, so history stays put when an old entry is edited — the user's choice
 * over recomputing. Append-only; the latest row per month wins.
 */

interface SnapshotRow {
  month: string;
  wallets: number;
  lent: number;
  owed: number;
  tontines: number;
  net_worth: number;
  income: number;
  spending: number;
  created_at: string;
}

/** Computes `monthISO` as of its last day and stores it as that month's latest snapshot. */
async function takeSnapshot(monthISO: string): Promise<void> {
  const [worth, flows] = await Promise.all([getNetWorthAsOf(lastDayOfMonth(monthISO)), getMonthFlows(monthISO)]);
  await execute(
    `INSERT INTO month_snapshots (month, wallets, lent, owed, tontines, net_worth, income, spending, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      monthISO,
      worth.wallets,
      worth.lent,
      worth.owed,
      worth.tontines,
      worth.total,
      flows.income,
      flows.spending,
      new Date().toISOString(),
    ],
  );
}

/** The month of the earliest dated entry anywhere money is logged, or null with none. */
async function firstMonth(): Promise<string | null> {
  const [row] = await query<{ first: string | null }>(
    `SELECT MIN(d) AS first FROM (
       SELECT MIN(date) AS d FROM income
       UNION ALL SELECT MIN(date) FROM expenses
       UNION ALL SELECT MIN(date) FROM transfers
       UNION ALL SELECT MIN(date) FROM balance_checks
       UNION ALL SELECT MIN(date) FROM debts
       UNION ALL SELECT MIN(date) FROM tontine_payments)`,
  );
  return row.first ? row.first.slice(0, 7) : null;
}

/**
 * The earliest due date of an active recurring bill not logged yet, or null.
 * A month ending on or after it is not settled: the auto-logger, which may not
 * have run yet on this app open, still owes it an expense.
 */
async function firstUnloggedBill(): Promise<string | null> {
  const [row] = await query<{ due: string | null }>(
    'SELECT MIN(next_due_date) AS due FROM recurring_expenses WHERE is_active = 1',
  );
  return row.due;
}

/**
 * Snapshots every closed month that has none yet: from the first logged entry
 * (at most `SNAPSHOT_LOOKBACK` months back) to last month. The current month is
 * never stored — it is still being lived — and neither is a month a recurring
 * bill is still to be logged into: it closes on a later run, once the
 * auto-logger has caught up. Run on app open and foreground (`MonthCloser`).
 */
export async function closeMonths(todayISO: string = toISODate(new Date())): Promise<void> {
  const first = await firstMonth();
  if (!first) return;
  const last = prevMonthISO(todayISO.slice(0, 7));
  let earliest = last;
  for (let i = 1; i < SNAPSHOT_LOOKBACK; i += 1) earliest = prevMonthISO(earliest);
  const start = first > earliest ? first : earliest;

  const [rows, unlogged] = await Promise.all([
    query<{ month: string }>('SELECT DISTINCT month FROM month_snapshots'),
    firstUnloggedBill(),
  ]);
  const stored = new Set(rows.map((r) => r.month));
  for (let month = start; month <= last; month = nextMonthISO(month)) {
    if (unlogged !== null && lastDayOfMonth(month) >= unlogged) break;
    if (!stored.has(month)) await takeSnapshot(month);
  }
}

/** Re-takes `monthISO`'s snapshot on purpose; the earlier figure stays on record. */
export async function recalculateMonth(monthISO: string): Promise<void> {
  await takeSnapshot(monthISO);
}

/** Every closed month's latest snapshot, newest month first. */
export async function getSnapshots(): Promise<MonthSnapshot[]> {
  const rows = await query<SnapshotRow>(
    `SELECT month, wallets, lent, owed, tontines, net_worth, income, spending, created_at
     FROM month_snapshots s
     WHERE s.id = (
       SELECT t.id FROM month_snapshots t WHERE t.month = s.month
       ORDER BY t.created_at DESC, t.id DESC LIMIT 1)
     ORDER BY month DESC`,
  );
  return rows.map((r) => ({
    month: r.month,
    netWorth: r.net_worth,
    wallets: r.wallets,
    lent: r.lent,
    owed: r.owed,
    tontines: r.tontines,
    income: r.income,
    spending: r.spending,
    savingsRate: savingsRate(r.income, r.spending),
    takenAt: r.created_at,
  }));
}
