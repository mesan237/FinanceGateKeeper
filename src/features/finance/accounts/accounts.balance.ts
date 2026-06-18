import { query } from '@/services/database';

import type { AccountHistoryEntry, AccountStats } from './accounts.types';

const SOURCE_LABELS: Record<string, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  ecommerce: 'E-commerce',
};

/**
 * Computes a wallet's live balance from its transaction history — never stored.
 * Adds the opening balance and income credits and transfers in; subtracts
 * expense debits, transfers out, manual fund deposits, and manual project
 * contributions. Rows with a NULL `account_id` (legacy entries and automated
 * allocation deposits) are excluded because they touch no real wallet.
 */
export async function getAccountBalance(id: number): Promise<number> {
  const rows = await query<{ balance: number }>(
    `SELECT
       (SELECT opening_balance FROM accounts WHERE id = ?)
       + COALESCE((SELECT SUM(amount) FROM income WHERE account_id = ?), 0)
       - COALESCE((SELECT SUM(amount) FROM expenses WHERE account_id = ?), 0)
       + COALESCE((SELECT SUM(amount) FROM transfers WHERE to_account_id = ?), 0)
       - COALESCE((SELECT SUM(amount) FROM transfers WHERE from_account_id = ?), 0)
       - COALESCE((SELECT SUM(amount) FROM fund_transactions
                     WHERE account_id = ? AND direction = 'deposit'), 0)
       - COALESCE((SELECT SUM(amount) FROM project_transactions
                     WHERE account_id = ? AND source = 'manual'), 0)
       AS balance`,
    [id, id, id, id, id, id, id],
  );
  return rows[0]?.balance ?? 0;
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * Returns an account's income and expense totals for `monthISO` (YYYY-MM) and
 * each as a percentage of all attributed accounts' totals for that month. Rows
 * with a NULL `account_id` are excluded from both the account total and the
 * all-accounts denominator. Percentages are 0 when the month has no activity.
 */
export async function getAccountStats(id: number, monthISO: string): Promise<AccountStats> {
  const pattern = `${monthISO}-%`;
  const [inc] = await query<{ acc: number; total: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN account_id = ? THEN amount END), 0) AS acc,
       COALESCE(SUM(amount), 0) AS total
     FROM income WHERE account_id IS NOT NULL AND date LIKE ?`,
    [id, pattern],
  );
  const [exp] = await query<{ acc: number; total: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN account_id = ? THEN amount END), 0) AS acc,
       COALESCE(SUM(amount), 0) AS total
     FROM expenses WHERE account_id IS NOT NULL AND date LIKE ?`,
    [id, pattern],
  );
  return {
    accountId: id,
    monthISO,
    totalIncome: inc.acc,
    totalExpenses: exp.acc,
    incomePercent: percent(inc.acc, inc.total),
    expensePercent: percent(exp.acc, exp.total),
  };
}

interface HistoryRow {
  kind: AccountHistoryEntry['kind'];
  ref_id: number;
  label: string | null;
  amount: number;
  date: string;
}

/**
 * Returns every transaction touching `id` — income credits, expense debits,
 * transfers in/out, and manual fund/project contributions — newest first. Each
 * entry's `amount` is positive; the `kind` carries the direction so the UI can
 * sign and colour it. Transfer labels name the counterpart account.
 */
export async function getAccountHistory(id: number): Promise<AccountHistoryEntry[]> {
  const rows = await query<HistoryRow>(
    `SELECT 'income' AS kind, i.id AS ref_id, i.source AS label, i.amount AS amount, i.date AS date
       FROM income i WHERE i.account_id = ?
     UNION ALL
     SELECT 'expense' AS kind, e.id AS ref_id, c.name AS label, e.amount AS amount, e.date AS date
       FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.account_id = ?
     UNION ALL
     SELECT 'transfer_out' AS kind, t.id AS ref_id, a.name AS label, t.amount AS amount, t.date AS date
       FROM transfers t JOIN accounts a ON t.to_account_id = a.id WHERE t.from_account_id = ?
     UNION ALL
     SELECT 'transfer_in' AS kind, t.id AS ref_id, a.name AS label, t.amount AS amount, t.date AS date
       FROM transfers t JOIN accounts a ON t.from_account_id = a.id WHERE t.to_account_id = ?
     UNION ALL
     SELECT 'fund_contribution' AS kind, f.id AS ref_id, f.reason AS label, f.amount AS amount, f.date AS date
       FROM fund_transactions f WHERE f.account_id = ? AND f.direction = 'deposit'
     UNION ALL
     SELECT 'project_contribution' AS kind, p.id AS ref_id, NULL AS label, p.amount AS amount, p.date AS date
       FROM project_transactions p WHERE p.account_id = ? AND p.source = 'manual'
     ORDER BY date DESC, ref_id DESC`,
    [id, id, id, id, id, id],
  );
  return rows.map((row) => ({
    kind: row.kind,
    refId: row.ref_id,
    amount: row.amount,
    date: row.date,
    label: labelFor(row),
  }));
}

function labelFor(row: HistoryRow): string {
  switch (row.kind) {
    case 'income':
      return SOURCE_LABELS[row.label ?? ''] ?? 'Income';
    case 'expense':
      return row.label ?? 'Expense';
    case 'transfer_out':
      return `Transfer to ${row.label}`;
    case 'transfer_in':
      return `Transfer from ${row.label}`;
    case 'fund_contribution':
      return row.label ?? 'Fund deposit';
    case 'project_contribution':
      return 'Project contribution';
  }
}
