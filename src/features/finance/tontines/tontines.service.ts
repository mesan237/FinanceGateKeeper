import i18n from 'i18next';

import type { tontines as tontinesCopy } from '@/i18n/locales/en/tontines';
import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import { buildCycles, summarise } from './tontines.schedule';
import {
  TONTINE_FREQUENCIES,
  type NewTontine,
  type Tontine,
  type TontineDetail,
  type TontinePatch,
  type TontinePayment,
  type TontineWithSummary,
} from './tontines.types';

/**
 * Tontine storage (VS-51). The schedule is derived, never stored; only what
 * the user actually paid and received is. Tontine money is neither spending nor
 * income: wallet balances read `tontine_payments` by SQL, like debt repayments.
 */

interface TontineRow {
  id: number;
  name: string;
  contribution_amount: number;
  frequency: Tontine['frequency'];
  start_date: string;
  members: number;
  payout_turn: number | null;
  account_id: number | null;
  created_at: string;
}

interface PaymentRow {
  id: number;
  tontine_id: number;
  kind: TontinePayment['kind'];
  cycle: number;
  amount: number;
  account_id: number | null;
  date: string;
}

const COLUMNS =
  'id, name, contribution_amount, frequency, start_date, members, payout_turn, account_id, created_at';

function mapTontine(row: TontineRow): Tontine {
  return {
    id: row.id,
    name: row.name,
    contributionAmount: row.contribution_amount,
    frequency: row.frequency,
    startDate: row.start_date,
    members: row.members,
    payoutTurn: row.payout_turn,
    accountId: row.account_id,
    createdAt: row.created_at,
  };
}

function mapPayment(row: PaymentRow): TontinePayment {
  return {
    id: row.id,
    tontineId: row.tontine_id,
    kind: row.kind,
    cycle: row.cycle,
    amount: row.amount,
    accountId: row.account_id,
    date: row.date,
  };
}

/** Throws the localised validation error `key`. */
function fail(key: keyof (typeof tontinesCopy)['errors']): never {
  throw new Error(i18n.t(`errors.${key}`, { ns: 'tontines' }));
}

/** True for a real `YYYY-MM-DD` calendar date. */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Throws unless `accountId` is null or an active wallet. */
async function assertWallet(accountId: number | null | undefined): Promise<void> {
  if (accountId === null || accountId === undefined) return;
  const [row] = await query<{ is_active: number }>('SELECT is_active FROM accounts WHERE id = ?', [accountId]);
  if (!row || row.is_active !== 1) fail('walletInvalid');
}

/** Validates a complete tontine and returns it with a trimmed name. */
async function normalise(input: NewTontine): Promise<NewTontine> {
  const name = input.name.trim();
  if (!name) fail('nameRequired');
  if (!Number.isInteger(input.contributionAmount) || input.contributionAmount <= 0) fail('amountPositive');
  if (!TONTINE_FREQUENCIES.includes(input.frequency)) fail('frequencyInvalid');
  if (!isValidDate(input.startDate)) fail('dateInvalid');
  if (!Number.isInteger(input.members) || input.members < 2 || input.members > 60) fail('membersInvalid');
  const turn = input.payoutTurn ?? null;
  if (turn !== null && (!Number.isInteger(turn) || turn < 1 || turn > input.members)) fail('turnInvalid');
  await assertWallet(input.accountId);
  return { ...input, name, payoutTurn: turn, accountId: input.accountId ?? null };
}

/**
 * Creates a tontine. Its schedule follows from the start date, the frequency
 * and the number of members.
 *
 * @returns the new tontine's id.
 * @throws on a blank name, a non-positive contribution, an unknown frequency,
 *   an invalid date, members outside 2–60, a turn beyond the members, or a
 *   hidden wallet.
 */
export async function createTontine(input: NewTontine): Promise<number> {
  const t = await normalise(input);
  await execute(
    `INSERT INTO tontines
       (name, contribution_amount, frequency, start_date, members, payout_turn, account_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [t.name, t.contributionAmount, t.frequency, t.startDate, t.members, t.payoutTurn ?? null, t.accountId ?? null, new Date().toISOString()],
  );
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return id;
}

async function getTontine(id: number): Promise<Tontine | null> {
  const rows = await query<TontineRow>(`SELECT ${COLUMNS} FROM tontines WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0] ? mapTontine(rows[0]) : null;
}

async function getPayments(tontineId: number): Promise<TontinePayment[]> {
  const rows = await query<PaymentRow>(
    `SELECT id, tontine_id, kind, cycle, amount, account_id, date FROM tontine_payments
     WHERE tontine_id = ? AND deleted_at IS NULL ORDER BY cycle ASC, id ASC`,
    [tontineId],
  );
  return rows.map(mapPayment);
}

/**
 * Applies `patch`, validating the result as a whole. Setting the turn once the
 * draw is done is the common edit.
 *
 * @throws as `createTontine`, and when fewer members would drop cycles that
 *   are already paid.
 */
export async function updateTontine(id: number, patch: TontinePatch): Promise<void> {
  const current = await getTontine(id);
  if (!current) fail('notFound');
  const t = await normalise({ ...current, ...patch });
  const payments = await getPayments(id);
  if (payments.some((p) => p.cycle > t.members)) fail('membersBelowPaid');
  await execute(
    `UPDATE tontines SET name = ?, contribution_amount = ?, frequency = ?, start_date = ?, members = ?,
       payout_turn = ?, account_id = ?
     WHERE id = ?`,
    [t.name, t.contributionAmount, t.frequency, t.startDate, t.members, t.payoutTurn ?? null, t.accountId ?? null, id],
  );
}

/**
 * Removes a tontine (soft delete). Its payments stop moving wallet balances —
 * the confirm sheet says so.
 */
export async function deleteTontine(id: number): Promise<void> {
  await execute('UPDATE tontines SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [new Date().toISOString(), id]);
}

/** One tontine with its summary and whole schedule, or null when gone. */
export async function getTontineDetail(
  id: number,
  todayISO: string = toISODate(new Date()),
): Promise<TontineDetail | null> {
  const tontine = await getTontine(id);
  if (!tontine) return null;
  const payments = await getPayments(id);
  const cycles = buildCycles(tontine, payments, todayISO);
  return { ...tontine, cycles, summary: summarise(tontine, cycles, payments) };
}

/** Every live tontine with its summary, oldest first. */
export async function getTontines(todayISO: string = toISODate(new Date())): Promise<TontineWithSummary[]> {
  const rows = await query<TontineRow>(
    `SELECT ${COLUMNS} FROM tontines WHERE deleted_at IS NULL ORDER BY created_at ASC, id ASC`,
  );
  return Promise.all(
    rows.map(async (row) => {
      const tontine = mapTontine(row);
      const payments = await getPayments(tontine.id);
      return { ...tontine, summary: summarise(tontine, buildCycles(tontine, payments, todayISO), payments) };
    }),
  );
}

async function insertPayment(
  tontineId: number,
  kind: TontinePayment['kind'],
  cycle: number,
  amount: number,
  accountId: number | null,
  date: string,
): Promise<void> {
  await execute(
    `INSERT INTO tontine_payments (tontine_id, kind, cycle, amount, account_id, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tontineId, kind, cycle, amount, accountId, date, new Date().toISOString()],
  );
}

/**
 * Ticks a cycle's contribution paid, through `accountId` (null: no wallet).
 * The amount is the tontine's contribution.
 *
 * @throws for an unknown tontine or cycle, a cycle already paid, an invalid
 *   date or a hidden wallet.
 */
export async function payContribution(
  tontineId: number,
  cycle: number,
  accountId: number | null,
  date: string = toISODate(new Date()),
): Promise<void> {
  const tontine = await getTontine(tontineId);
  if (!tontine) fail('notFound');
  if (!Number.isInteger(cycle) || cycle < 1 || cycle > tontine.members) fail('cycleInvalid');
  if (!isValidDate(date)) fail('dateInvalid');
  await assertWallet(accountId);
  const payments = await getPayments(tontineId);
  if (payments.some((p) => p.kind === 'contribution' && p.cycle === cycle)) fail('alreadyPaid');
  await insertPayment(tontineId, 'contribution', cycle, tontine.contributionAmount, accountId, date);
}

/**
 * Records the payout the user received on their turn. The amount is asked
 * because groups sometimes keep a fee; the screen offers the full pot.
 *
 * @throws without a turn, when a payout is already recorded, or on a
 *   non-positive amount, an invalid date or a hidden wallet.
 */
export async function recordPayout(
  tontineId: number,
  amount: number,
  accountId: number | null,
  date: string = toISODate(new Date()),
): Promise<void> {
  const tontine = await getTontine(tontineId);
  if (!tontine) fail('notFound');
  if (tontine.payoutTurn === null) fail('turnRequired');
  if (!Number.isInteger(amount) || amount <= 0) fail('amountPositive');
  if (!isValidDate(date)) fail('dateInvalid');
  await assertWallet(accountId);
  const payments = await getPayments(tontineId);
  if (payments.some((p) => p.kind === 'payout')) fail('payoutRecorded');
  await insertPayment(tontineId, 'payout', tontine.payoutTurn, amount, accountId, date);
}

/** Un-ticks a contribution or removes the payout (soft delete); the money returns to its wallet. */
export async function removePayment(paymentId: number): Promise<void> {
  await execute('UPDATE tontine_payments SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    new Date().toISOString(),
    paymentId,
  ]);
}
