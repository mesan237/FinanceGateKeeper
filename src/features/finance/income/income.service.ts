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
      input.allocationStatus ?? 'pending',
      new Date().toISOString(),
    ],
  );

  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/**
 * Returns every income row still held in the unallocated pool (status
 * `pending`), newest first. The budget feature reads this to show and clear the
 * pool; each row stays here until the user allocates it to a destination.
 */
export async function getPendingIncome(): Promise<Income[]> {
  const rows = await query<IncomeRow>(
    `SELECT ${INCOME_COLUMNS} FROM income WHERE allocation_status = 'pending' ${ORDER_BY_NEWEST}`,
  );
  return rows.map(mapIncome);
}

/**
 * Marks the income row `id` as `allocated`, so it starts counting toward the
 * month's expense budget. Idempotent — calling it on an already-allocated row
 * is a no-op. No-op as well for an unknown id (no row matches).
 */
export async function markIncomeAllocated(id: number): Promise<void> {
  await execute(`UPDATE income SET allocation_status = 'allocated' WHERE id = ?`, [id]);
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
 * Updates an income row with a full-row patch (VS-20). While the row is
 * `pending`, every field may change. Once `allocated`, its money trail is
 * immutable — deposits were made and the month's budget counted it — so only
 * metadata (source, note, accountId) may change; an amount or date change is
 * rejected. Reuses `createIncome`'s validation so no caller can write bad rows.
 *
 * @throws if the row does not exist, the patch is invalid, or it changes the
 *         amount/date of an allocated row.
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
  if (
    existing.allocationStatus === 'allocated' &&
    (patch.amount !== existing.amount || patch.date !== existing.date)
  ) {
    throw new Error('Allocated income cannot change amount or date.');
  }

  await execute(
    `UPDATE income SET amount = ?, source = ?, date = ?, note = ?, account_id = ? WHERE id = ?`,
    [patch.amount, patch.source, patch.date, patch.note ?? null, patch.accountId ?? null, id],
  );
}

/**
 * Deletes a *pending* income row (VS-20). Allocated rows are never deleted —
 * their deposits and budget contribution would silently desynchronise. Note:
 * like `deleteExpense` (VS-17), this is a plain DELETE with no sync tombstone;
 * a previously pushed row can resurrect on the next cloud pull.
 *
 * @throws if the row does not exist or is allocated.
 */
export async function deleteIncome(id: number): Promise<void> {
  const existing = await getIncomeById(id);
  if (!existing) throw new Error('Income not found.');
  if (existing.allocationStatus === 'allocated') {
    throw new Error('Allocated income cannot be deleted.');
  }
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
