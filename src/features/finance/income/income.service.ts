import { INCOME_SOURCE_VALUES } from '@/constants/incomeSources';
import { execute, query } from '@/services/database';

import type { Income, NewIncome } from './income.types';

interface IncomeRow {
  id: number;
  amount: number;
  source: Income['source'];
  note: string | null;
  date: string;
  created_at: string;
}

const INCOME_COLUMNS = 'id, amount, source, note, date, created_at';
const ORDER_BY_NEWEST = 'ORDER BY date DESC, created_at DESC';

function mapIncome(row: IncomeRow): Income {
  return {
    id: row.id,
    amount: row.amount,
    source: row.source,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
  };
}

/**
 * Validates and inserts a new income row, returning the new id. Validation lives
 * here (not only in the form hook) so callers that bypass `useIncomeLog` — e.g.
 * VS-06's allocation trigger or a future Supabase sync — cannot write bad rows.
 * The `source` check defends the DB at runtime; TypeScript only checks at
 * compile time.
 *
 * @throws if `amount` is not a positive integer, or `source` is not a known value.
 */
export async function createIncome(input: NewIncome): Promise<number> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Income amount must be a positive integer (FCFA).');
  }
  if (!INCOME_SOURCE_VALUES.has(input.source)) {
    throw new Error(`Unknown income source: ${input.source}.`);
  }

  await execute(
    `INSERT INTO income (amount, source, note, date, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [input.amount, input.source, input.note ?? null, input.date, new Date().toISOString()],
  );

  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/** Returns every income row, newest first (by date, then insertion time). */
export async function getAllIncome(): Promise<Income[]> {
  const rows = await query<IncomeRow>(`SELECT ${INCOME_COLUMNS} FROM income ${ORDER_BY_NEWEST}`);
  return rows.map(mapIncome);
}

/** Returns income tagged with the given source, newest first. */
export async function getIncomeBySource(source: Income['source']): Promise<Income[]> {
  const rows = await query<IncomeRow>(
    `SELECT ${INCOME_COLUMNS} FROM income WHERE source = ? ${ORDER_BY_NEWEST}`,
    [source],
  );
  return rows.map(mapIncome);
}

/**
 * Returns income whose `date` falls within `[from, to]` inclusive. Dates are
 * compared as ISO strings, which sort chronologically.
 */
export async function getIncomeByDateRange(from: string, to: string): Promise<Income[]> {
  const rows = await query<IncomeRow>(
    `SELECT ${INCOME_COLUMNS} FROM income WHERE date >= ? AND date <= ? ${ORDER_BY_NEWEST}`,
    [from, to],
  );
  return rows.map(mapIncome);
}

/**
 * Sums `amount` across all sources for the given month. `monthISO` is
 * `"YYYY-MM"`; the `date LIKE 'YYYY-MM-%'` predicate uses the index on `date`.
 * Returns 0 when no rows match.
 */
export async function getMonthlyTotal(monthISO: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE date LIKE ?`,
    [`${monthISO}-%`],
  );
  return row.total;
}
