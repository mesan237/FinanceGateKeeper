import i18n from 'i18next';

import { labelForSource } from '@/constants/incomeSources';
import { displayCategoryName } from '@/i18n/categoryNames';
import type { accounts as accountsCopy } from '@/i18n/locales/en/accounts';
import { query } from '@/services/database';
import { formatCurrency } from '@/utils/formatCurrency';

import type { AccountHistoryEntry, AccountStats } from './accounts.types';

/** The latest live balance check on a wallet: its confirmed figure and when it was made. */
interface Checkpoint {
  balance: number;
  date: string;
  created_at: string;
}

/**
 * The wallet's most recent balance check that has not been removed, or null.
 * "Latest" is by date, then by when it was saved.
 */
async function latestCheck(id: number): Promise<Checkpoint | null> {
  const rows = await query<Checkpoint>(
    `SELECT balance, date, created_at FROM balance_checks
     WHERE account_id = ? AND deleted_at IS NULL
     ORDER BY date DESC, created_at DESC LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Computes a wallet's live balance from its transaction history — never stored.
 * Adds income credits and transfers in; subtracts expense debits, transfers
 * out, manual fund deposits, and manual project contributions. Rows with a NULL
 * `account_id` (legacy entries and automated allocation deposits) are excluded
 * because they touch no real wallet.
 *
 * The starting point is the latest balance check when there is one (VS-42):
 * the confirmed figure, plus only what happened after it — a later date, or the
 * same date saved after the check. Back-logging an older transaction therefore
 * cannot move a balance the user has already confirmed. Without a check, the
 * account's opening balance plus its whole history is used, as before.
 */
export async function getAccountBalance(id: number): Promise<number> {
  const check = await latestCheck(id);
  const after = check ? ' AND (date > ? OR (date = ? AND created_at > ?))' : '';
  const afterParams = check ? [check.date, check.date, check.created_at] : [];
  const flow = (owner: string, extra = '') => ({
    sql: `${owner} = ?${extra}${after}`,
    params: [id, ...afterParams],
  });
  const parts = [
    { sign: '+', table: 'income', ...flow('account_id') },
    { sign: '-', table: 'expenses', ...flow('account_id') },
    { sign: '+', table: 'transfers', ...flow('to_account_id') },
    { sign: '-', table: 'transfers', ...flow('from_account_id') },
    { sign: '-', table: 'fund_transactions', ...flow('account_id', " AND direction = 'deposit'") },
    { sign: '-', table: 'project_transactions', ...flow('account_id', " AND source = 'manual'") },
  ];

  const base = check
    ? { sql: '?', params: [check.balance] }
    : { sql: '(SELECT opening_balance FROM accounts WHERE id = ?)', params: [id] };
  const sum = parts
    .map((p) => `${p.sign} COALESCE((SELECT SUM(amount) FROM ${p.table} WHERE ${p.sql}), 0)`)
    .join(' ');

  const rows = await query<{ balance: number }>(
    `SELECT ${base.sql} ${sum} AS balance`,
    [...base.params, ...parts.flatMap((p) => p.params)],
  );
  return rows[0]?.balance ?? 0;
}

/**
 * Expenses that no wallet accounts for — logged before wallets existed, or
 * from a template without a wallet. Wallet balances leave them out, so the
 * accounts screen says how much is unassigned rather than hiding it (VS-42).
 */
export async function getUnassignedSpending(): Promise<{ count: number; total: number }> {
  const [row] = await query<{ count: number; total: number }>(
    'SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE account_id IS NULL',
  );
  return { count: row.count, total: row.total };
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
     UNION ALL
     SELECT 'balance_check' AS kind, b.id AS ref_id, CAST(b.balance AS TEXT) AS label,
            b.difference AS amount, b.date AS date
       FROM balance_checks b WHERE b.account_id = ? AND b.deleted_at IS NULL
     ORDER BY date DESC, ref_id DESC`,
    [id, id, id, id, id, id, id],
  );
  return rows.map((row) => ({
    kind: row.kind,
    refId: row.ref_id,
    amount: row.amount,
    date: row.date,
    label: labelFor(row),
  }));
}

/** A history-row label in the active UI language; `account` names a transfer's counterpart. */
function history(key: keyof (typeof accountsCopy)['history'], account = '', amount = ''): string {
  return i18n.t(`history.${key}`, { ns: 'accounts', account, amount });
}

function labelFor(row: HistoryRow): string {
  switch (row.kind) {
    case 'income':
      return row.label ? labelForSource(row.label) : history('income');
    case 'expense':
      return row.label ? displayCategoryName(row.label) : history('expense');
    case 'transfer_out':
      return history('transferTo', row.label ?? '');
    case 'transfer_in':
      return history('transferFrom', row.label ?? '');
    case 'fund_contribution':
      return row.label ?? history('fundDeposit');
    case 'project_contribution':
      return history('projectContribution');
    case 'balance_check':
      return history('balanceCheck', '', formatCurrency(Number(row.label ?? 0)));
  }
}
