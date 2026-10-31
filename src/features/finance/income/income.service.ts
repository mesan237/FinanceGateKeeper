import i18n from 'i18next';

import { execute, query } from '@/services/database';

import type { Income, NewIncome, UpdateIncome } from './income.types';
import { incomeSourceExists } from './incomeSources.service';

/** A validation message in the active UI language — thrown errors reach the screen as-is. */
function err(key: 'amountPositive' | 'unknownSource' | 'notFound'): string {
  return i18n.t(`errors.${key}`, { ns: 'income' });
}

/** Rejects a non-positive amount and a source id with no `income_sources` row. */
async function validate(amount: number, sourceId: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(err('amountPositive'));
  if (!(await incomeSourceExists(sourceId))) throw new Error(err('unknownSource'));
}

interface IncomeRow {
  id: number;
  amount: number;
  source_id: number;
  note: string | null;
  date: string;
  account_id: number | null;
  allocation_status: Income['allocationStatus'];
  created_at: string;
}

const INCOME_COLUMNS =
  'id, amount, source_id, note, date, account_id, allocation_status, created_at';
const ORDER_BY_NEWEST = 'ORDER BY date DESC, created_at DESC';

function mapIncome(row: IncomeRow): Income {
  return {
    id: row.id,
    amount: row.amount,
    sourceId: row.source_id,
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
 * The source check gives a readable message instead of a foreign-key error.
 *
 * @throws if `amount` is not a positive integer, or `sourceId` is not a known source.
 */
export async function createIncome(input: NewIncome): Promise<number> {
  await validate(input.amount, input.sourceId);

  await execute(
    `INSERT INTO income (amount, source_id, note, date, account_id, allocation_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.amount,
      input.sourceId,
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
  await validate(patch.amount, patch.sourceId);

  const existing = await getIncomeById(id);
  if (!existing) throw new Error(err('notFound'));

  await execute(
    `UPDATE income SET amount = ?, source_id = ?, date = ?, note = ?, account_id = ? WHERE id = ?`,
    [patch.amount, patch.sourceId, patch.date, patch.note ?? null, patch.accountId ?? null, id],
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
  if (!existing) throw new Error(err('notFound'));
  await execute('DELETE FROM income WHERE id = ?', [id]);
}

/** Returns every income row, newest first (by date, then insertion time). */
export async function getAllIncome(): Promise<Income[]> {
  const rows = await query<IncomeRow>(`SELECT ${INCOME_COLUMNS} FROM income ${ORDER_BY_NEWEST}`);
  return rows.map(mapIncome);
}

/** Returns income on the given source or one of its subsources, newest first. */
export async function getIncomeBySource(sourceId: number): Promise<Income[]> {
  const rows = await query<IncomeRow>(
    `SELECT ${INCOME_COLUMNS} FROM income
     WHERE source_id = ? OR source_id IN (SELECT id FROM income_sources WHERE parent_id = ?)
     ${ORDER_BY_NEWEST}`,
    [sourceId, sourceId],
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
