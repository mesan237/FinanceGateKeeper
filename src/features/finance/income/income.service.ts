import { INCOME_SOURCE_VALUES } from '@/constants/incomeSources';
import { execute, query } from '@/services/database';

import type { Income, NewIncome, UpdateIncome } from './income.types';

interface IncomeRow {
  id: number;
  amount: number;
  source: Income['source'];
  note: string | null;
  date: string;
  account_id: number | null;
  allocation_status: Income['allocationStatus'];
  created_at: string;
}

const INCOME_COLUMNS =
  'id, amount, source, note, date, account_id, allocation_status, created_at';
const ORDER_BY_NEWEST = 'ORDER BY date DESC, created_at DESC';

function mapIncome(row: IncomeRow): Income {
  return {
    id: row.id,
    amount: row.amount,
    source: row.source,
    note: row.note,
    date: row.date,
    accountId: row.account_id,
    allocationStatus: row.allocation_status,
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
    `INSERT INTO income (amount, source, note, date, account_id, allocation_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.amount,
      input.source,
      input.note ?? null,
      input.date,
      input.accountId ?? null,
      // Since VS-34 income is recorded, not allocated — nothing holds a row in a
      // pending pool, so it lands counted. The column stays for sync/schema
      // stability; no read path branches on it any more.
      input.allocationStatus ?? 'allocated',
      new Date().toISOString(),
    ],
  );

  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/** Returns the income row with the given id, or null when it does not exist. */
export async function getIncomeById(id: number): Promise<Income | null> {
  const [row] = await query<IncomeRow>(
    `SELECT ${INCOME_COLUMNS} FROM income WHERE id = ?`,
    [id],
  );
  return row ? mapIncome(row) : null;
}

/**
 * Updates an income row with a full-row patch (VS-20). Every field may change.
 *
 * The amount/date freeze that used to apply to `allocated` rows is gone (VS-34):
 * it existed because allocation had moved real money into funds and projects,
 * and editing the source would desync those deposits. With no allocation step
 * there is no downstream deposit, so a typo stays correctable. Reuses
 * `createIncome`'s validation so no caller can write bad rows.
 *
 * @throws if the row does not exist or the patch is invalid.
 */
export async function updateIncome(id: number, patch: UpdateIncome): Promise<void> {
  if (!Number.isInteger(patch.amount) || patch.amount <= 0) {
    throw new Error('Income amount must be a positive integer (FCFA).');
  }
  if (!INCOME_SOURCE_VALUES.has(patch.source)) {
    throw new Error(`Unknown income source: ${patch.source}.`);
  }

  const existing = await getIncomeById(id);
  if (!existing) throw new Error('Income not found.');

  await execute(
    `UPDATE income SET amount = ?, source = ?, date = ?, note = ?, account_id = ? WHERE id = ?`,
    [patch.amount, patch.source, patch.date, patch.note ?? null, patch.accountId ?? null, id],
  );
}

/**
 * Deletes an income row (VS-20). The allocated-rows-are-permanent rule is gone
 * (VS-34) for the same reason as in `updateIncome` — no deposits hang off an
 * income any more. Note: like `deleteExpense` (VS-17), this is a plain DELETE
 * with no sync tombstone; a previously pushed row can resurrect on the next
 * cloud pull.
 *
 * @throws if the row does not exist.
 */
export async function deleteIncome(id: number): Promise<void> {
  const existing = await getIncomeById(id);
  if (!existing) throw new Error('Income not found.');
  await execute('DELETE FROM income WHERE id = ?', [id]);
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
