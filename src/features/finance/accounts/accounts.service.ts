import { execute, query } from '@/services/database';
import { toISODate } from '@/utils/formatDate';

import type { Account, NewAccountFields, AccountPatch, Transfer } from './accounts.types';

export {
  getAccountBalance,
  getAccountStats,
  getAccountHistory,
} from './accounts.balance';

interface AccountRow {
  id: number;
  name: string;
  type: Account['type'];
  purpose: Account['purpose'];
  opening_balance: number;
  is_default: number;
  is_active: number;
  created_at: string;
}

interface TransferRow {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

const ACCOUNT_COLUMNS =
  'id, name, type, purpose, opening_balance, is_default, is_active, created_at';

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    purpose: row.purpose,
    openingBalance: row.opening_balance,
    isDefault: row.is_default === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

function mapTransfer(row: TransferRow): Transfer {
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

/** Returns the active accounts, the default first, then alphabetically by name. */
export async function getAccounts(): Promise<Account[]> {
  const rows = await query<AccountRow>(
    `SELECT ${ACCOUNT_COLUMNS} FROM accounts
     WHERE is_active = 1
     ORDER BY is_default DESC, name ASC`,
  );
  return rows.map(mapAccount);
}

/** Reads one account by id (active or hidden), or `null` if no such row. */
export async function getAccountById(id: number): Promise<Account | null> {
  const rows = await query<AccountRow>(`SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE id = ?`, [
    id,
  ]);
  return rows[0] ? mapAccount(rows[0]) : null;
}

/** Clears every account's default flag. Caller is responsible for setting the new one. */
async function clearDefault(): Promise<void> {
  await execute('UPDATE accounts SET is_default = 0 WHERE is_default = 1');
}

/**
 * Creates a wallet. The name must be non-empty and `openingBalance` a
 * non-negative integer (defaults to 0). When `isDefault` is set, the previous
 * default is cleared first so exactly one account is ever the default.
 *
 * @returns the created account.
 */
export async function createAccount(fields: NewAccountFields): Promise<Account> {
  const name = fields.name.trim();
  if (!name) throw new Error('Account name is required.');
  const openingBalance = fields.openingBalance ?? 0;
  if (!Number.isInteger(openingBalance) || openingBalance < 0) {
    throw new Error('Opening balance must be a non-negative integer.');
  }
  // Clearing the prior default and inserting the new default account must be
  // atomic so a failure can't leave the table with zero or two defaults.
  await execute('BEGIN TRANSACTION');
  try {
    if (fields.isDefault) await clearDefault();
    await execute(
      `INSERT INTO accounts (name, type, purpose, opening_balance, is_default, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [name, fields.type, fields.purpose, openingBalance, fields.isDefault ? 1 : 0, new Date().toISOString()],
    );
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  const created = await getAccountById(id);
  if (!created) throw new Error('Failed to create account.');
  return created;
}

/**
 * Updates editable fields on a wallet. Setting `isDefault` to true clears the
 * previous default first. Fields not present in `patch` are left unchanged.
 */
export async function updateAccount(id: number, patch: AccountPatch): Promise<void> {
  const current = await getAccountById(id);
  if (!current) throw new Error(`Account ${id} does not exist.`);

  const name = patch.name === undefined ? current.name : patch.name.trim();
  if (!name) throw new Error('Account name is required.');
  const openingBalance =
    patch.openingBalance === undefined ? current.openingBalance : patch.openingBalance;
  if (!Number.isInteger(openingBalance) || openingBalance < 0) {
    throw new Error('Opening balance must be a non-negative integer.');
  }
  const type = patch.type ?? current.type;
  const purpose = patch.purpose ?? current.purpose;

  const isDefault = patch.isDefault === undefined ? current.isDefault : patch.isDefault;

  await execute('BEGIN TRANSACTION');
  try {
    if (patch.isDefault) await clearDefault();
    await execute(
      `UPDATE accounts SET name = ?, type = ?, purpose = ?, opening_balance = ?, is_default = ?
       WHERE id = ?`,
      [name, type, purpose, openingBalance, isDefault ? 1 : 0, id],
    );
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
}

/** Soft-deletes a wallet (is_active = 0). Its transaction history is preserved. */
export async function hideAccount(id: number): Promise<void> {
  await execute('UPDATE accounts SET is_active = 0 WHERE id = ?', [id]);
}

/**
 * Makes `id` the sole default account, clearing any previous default first.
 * Wrapped in a transaction so there is never a window with zero or two defaults.
 */
export async function setDefaultAccount(id: number): Promise<void> {
  await execute('BEGIN TRANSACTION');
  try {
    await clearDefault();
    await execute('UPDATE accounts SET is_default = 1 WHERE id = ?', [id]);
    await execute('COMMIT');
  } catch (error) {
    await execute('ROLLBACK');
    throw error;
  }
}

/**
 * Logs an account-to-account transfer. The two accounts must differ and the
 * amount must be a positive integer. The transfer debits `fromId` and credits
 * `toId` in every subsequent balance read.
 *
 * @returns the created transfer.
 */
export async function logTransfer(
  fromId: number,
  toId: number,
  amount: number,
  date: string = toISODate(new Date()),
  note?: string,
): Promise<Transfer> {
  if (fromId === toId) throw new Error('Cannot transfer to the same account.');
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Transfer amount must be a positive integer.');
  }
  await execute(
    `INSERT INTO transfers (from_account_id, to_account_id, amount, date, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fromId, toId, amount, date, note ?? null, new Date().toISOString()],
  );
  const [{ id }] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return {
    id,
    fromAccountId: fromId,
    toAccountId: toId,
    amount,
    date,
    note: note ?? null,
    createdAt: new Date().toISOString(),
  };
}

/** Returns the transfers logged in `monthISO` (YYYY-MM), newest first. */
export async function getTransfers(monthISO: string): Promise<Transfer[]> {
  const rows = await query<TransferRow>(
    `SELECT id, from_account_id, to_account_id, amount, date, note, created_at
     FROM transfers WHERE date LIKE ? ORDER BY date DESC, id DESC`,
    [`${monthISO}-%`],
  );
  return rows.map(mapTransfer);
}
