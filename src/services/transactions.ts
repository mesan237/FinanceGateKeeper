import { labelForIncomeSource } from '@/constants/incomeSources';
import { query } from '@/services/database';
import type { TransactionEntry } from '@/types/transactions';

interface UnifiedRow {
  type: 'expense' | 'income';
  id: number;
  amount: number;
  date: string;
  category_id: number | null;
  category_label: string | null;
  subcategory_id: number | null;
  subcategory_label: string | null;
  note: string | null;
  source_key: string | null;
  source_name: string | null;
  parent_key: string | null;
  account_id: number | null;
  account_label: string | null;
  is_unplanned: number;
  refund_of: number | null;
}

interface TransferRow {
  id: number;
  amount: number;
  date: string;
  from_account_name: string;
  to_account_name: string;
}

/**
 * Returns all income, expense, and transfer rows for a calendar month, sorted
 * newest-first (date DESC, id DESC as a stable tie-break). Expense rows have
 * their category label resolved via JOIN; income rows have a human-readable
 * sourceLabel from `income_sources` (VS-91); both carry their source/destination
 * account name (null for legacy rows logged before accounts existed). Transfer
 * rows name both wallets.
 *
 * @param monthISO YYYY-MM string, e.g. "2026-06".
 */
export async function getTransactionFeed(monthISO: string): Promise<TransactionEntry[]> {
  const pattern = `${monthISO}-%`;

  const rows = await query<UnifiedRow>(
    `SELECT
       'expense'        AS type,
       e.id             AS id,
       e.amount         AS amount,
       e.date           AS date,
       e.category_id    AS category_id,
       c.name           AS category_label,
       e.subcategory_id AS subcategory_id,
       sc.name          AS subcategory_label,
       e.note           AS note,
       NULL             AS source_key,
       NULL             AS source_name,
       NULL             AS parent_key,
       e.account_id     AS account_id,
       ea.name          AS account_label,
       e.is_unplanned   AS is_unplanned,
       e.refund_of      AS refund_of
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     LEFT JOIN categories sc ON e.subcategory_id = sc.id
     LEFT JOIN accounts ea ON e.account_id = ea.id
     WHERE e.date LIKE ?
     UNION ALL
     SELECT
       'income' AS type,
       i.id     AS id,
       i.amount AS amount,
       i.date   AS date,
       NULL     AS category_id,
       NULL     AS category_label,
       NULL     AS subcategory_id,
       NULL     AS subcategory_label,
       i.note   AS note,
       s.key    AS source_key,
       s.name   AS source_name,
       ps.key   AS parent_key,
       i.account_id AS account_id,
       ia.name      AS account_label,
       0            AS is_unplanned,
       NULL         AS refund_of
     FROM income i
     JOIN income_sources s ON i.source_id = s.id
     LEFT JOIN income_sources ps ON s.parent_id = ps.id
     LEFT JOIN accounts ia ON i.account_id = ia.id
     WHERE i.date LIKE ?`,
    [pattern, pattern],
  );

  const transferRows = await query<TransferRow>(
    `SELECT t.id AS id, t.amount AS amount, t.date AS date,
            af.name AS from_account_name, at2.name AS to_account_name
     FROM transfers t
     JOIN accounts af ON t.from_account_id = af.id
     JOIN accounts at2 ON t.to_account_id = at2.id
     WHERE t.date LIKE ? AND t.deleted_at IS NULL`,
    [pattern],
  );

  const entries: TransactionEntry[] = rows.map((row): TransactionEntry => {
    if (row.type === 'expense') {
      return {
        type: 'expense',
        id: row.id,
        amount: row.amount,
        date: row.date,
        categoryId: row.category_id!,
        categoryLabel: row.category_label!,
        subcategoryId: row.subcategory_id,
        subcategoryLabel: row.subcategory_label,
        note: row.note,
        accountId: row.account_id,
        accountLabel: row.account_label,
        isUnplanned: row.is_unplanned === 1,
        refundOf: row.refund_of,
      };
    }
    const name = row.source_name!;
    return {
      type: 'income',
      id: row.id,
      amount: row.amount,
      date: row.date,
      // The icon/tint key: a built-in's own key, else its parent's, else the name.
      source: row.source_key ?? row.parent_key ?? name,
      sourceLabel: labelForIncomeSource(row.source_key, name),
      note: row.note,
      accountId: row.account_id,
      accountLabel: row.account_label,
    };
  });

  for (const row of transferRows) {
    entries.push({
      type: 'transfer',
      id: row.id,
      amount: row.amount,
      date: row.date,
      fromAccountName: row.from_account_name,
      toAccountName: row.to_account_name,
    });
  }

  // Newest-first, with id DESC as a stable tie-break within a day.
  entries.sort((a, b) => (a.date !== b.date ? (a.date > b.date ? -1 : 1) : b.id - a.id));
  return entries;
}

/**
 * The logged days in `[from, to]` (`YYYY-MM-DD`, inclusive): days with an
 * expense or a confirmed no-spend day — the glossary's *Logged day*, the same
 * one Observe counts toward a complete month (`expenses.coverage`). The daily
 * reminder skips these days (VS-57). Income and transfers don't make a day
 * logged (VS-88): a day with only income still says nothing about spending.
 */
export async function getLoggedDays(from: string, to: string): Promise<Set<string>> {
  const rows = await query<{ date: string }>(
    `SELECT date FROM expenses WHERE date BETWEEN ? AND ?
     UNION SELECT date FROM zero_days WHERE date BETWEEN ? AND ?`,
    [from, to, from, to],
  );
  return new Set(rows.map((r) => r.date));
}

/**
 * Names of events by id (VS-62), for labelling spending grouped by event. Read
 * here, in shared infrastructure, so the slices that group by event (budget,
 * reports) need not import the events slice.
 */
export async function getEventNames(ids: ReadonlyArray<number>): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await query<{ id: number; name: string }>(
    `SELECT id, name FROM events WHERE id IN (${unique.map(() => '?').join(', ')})`,
    unique,
  );
  return new Map(rows.map((r) => [r.id, r.name]));
}
