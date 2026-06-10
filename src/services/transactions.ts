import { query } from '@/services/database';
import type { TransactionEntry } from '@/types/transactions';

const SOURCE_LABELS: Record<string, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  ecommerce: 'E-commerce',
};

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
  source: string | null;
}

/**
 * Returns all income and expense rows for a calendar month, sorted newest-first
 * (date DESC, id DESC as a stable tie-break). Each expense row has its category
 * label resolved via JOIN; each income row has a human-readable sourceLabel.
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
       NULL             AS source
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     LEFT JOIN categories sc ON e.subcategory_id = sc.id
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
       i.source AS source
     FROM income i
     WHERE i.date LIKE ?
     ORDER BY date DESC, id DESC`,
    [pattern, pattern],
  );

  return rows.map((row): TransactionEntry => {
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
      };
    }
    const source = row.source!;
    return {
      type: 'income',
      id: row.id,
      amount: row.amount,
      date: row.date,
      source,
      sourceLabel: SOURCE_LABELS[source] ?? source,
      note: row.note,
    };
  });
}
