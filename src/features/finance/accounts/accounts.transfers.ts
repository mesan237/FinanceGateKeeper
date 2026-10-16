import i18n from 'i18next';

import { execute, query } from '@/services/database';

import type { Transfer, TransferPatch } from './accounts.types';

/**
 * Correcting and removing transfers (VS-43). A transfer logged with the wrong
 * amount or wallet used to be permanent; now it can be edited or removed.
 * Removal is a soft delete (`deleted_at`): the sync engine never sends
 * deletions, so a hard-deleted transfer would come back on the next restore
 * and move money between wallets again. Every read skips removed rows.
 */

/** A persisted `transfers` row. */
export interface TransferRow {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Maps a `transfers` row to the domain shape. */
export function mapTransfer(row: TransferRow): Transfer {
  return {
    id: row.id,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: row.amount,
    date: row.date,
    note: row.note,
    createdAt: row.created_at,
  };
}

/** Returns the live transfer with `id`, or null when it is missing or removed. */
export async function getTransferById(id: number): Promise<Transfer | null> {
  const [row] = await query<TransferRow>(
    `SELECT id, from_account_id, to_account_id, amount, date, note, created_at
     FROM transfers WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? mapTransfer(row) : null;
}

/**
 * Replaces every editable field of a live transfer. Validated like a new one:
 * two different wallets, a positive whole amount, a `YYYY-MM-DD` date.
 *
 * @throws if the transfer is missing or removed, or the patch is invalid.
 */
export async function updateTransfer(id: number, patch: TransferPatch): Promise<void> {
  if (patch.fromAccountId === patch.toAccountId) {
    throw new Error(i18n.t('errors.sameAccount', { ns: 'accounts' }));
  }
  if (!Number.isInteger(patch.amount) || patch.amount <= 0) {
    throw new Error(i18n.t('errors.transferAmount', { ns: 'accounts' }));
  }
  if (!ISO_DATE.test(patch.date)) {
    throw new Error(i18n.t('errors.transferDate', { ns: 'accounts' }));
  }
  if (!(await getTransferById(id))) {
    throw new Error(i18n.t('errors.transferNotFound', { ns: 'accounts' }));
  }
  await execute(
    `UPDATE transfers SET from_account_id = ?, to_account_id = ?, amount = ?, date = ?, note = ?
     WHERE id = ?`,
    [patch.fromAccountId, patch.toAccountId, patch.amount, patch.date, patch.note?.trim() || null, id],
  );
}

/** Removes a transfer (soft delete). A no-op when it is already removed. */
export async function removeTransfer(id: number): Promise<void> {
  await execute('UPDATE transfers SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
    new Date().toISOString(),
    id,
  ]);
}
