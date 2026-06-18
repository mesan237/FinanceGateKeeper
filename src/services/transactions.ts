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
  account_id: number | null;
  account_label: string | null;
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
 * sourceLabel; both carry their source/destination account name (null for
 * legacy rows logged before accounts existed). Transfer rows name both wallets.
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
       NULL             AS source,
       e.account_id     AS account_id,
       ea.name          AS account_label
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
       i.source AS source,
       i.account_id AS account_id,
       ia.name      AS account_label
     FROM income i
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
     WHERE t.date LIKE ?`,
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
