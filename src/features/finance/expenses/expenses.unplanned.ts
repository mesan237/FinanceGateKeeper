import { query } from '@/services/database';

import type { UnplannedTotals } from './expenses.types';

/**
 * Counts the expenses marked as imprévus between `from` and `to` (inclusive
 * `YYYY-MM-DD` dates) and sums what they cost. Feeds the Reports card and the
 * dashboard's month overview.
 */
export async function getUnplannedTotals(from: string, to: string): Promise<UnplannedTotals> {
  const [row] = await query<{ count: number; total: number }>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE is_unplanned = 1 AND date >= ? AND date <= ?`,
    [from, to],
  );
  return { count: row.count, total: row.total };
}
