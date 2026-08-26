import { execute, query, type SqlBindValue } from '@/services/database';

/** A database row as a plain column→value bag. */
export type Row = Record<string, unknown>;

/**
 * Foreign-key columns per synced table, mapping the local column to the table it
 * references. The sync engine translates these between local integer ids (the
 * in-app currency) and portable `uuid`s (the cloud currency) on every push/pull,
 * so relationships survive a restore onto a device with different autoincrement
 * ids. `categories.parent_id` is self-referential.
 */
export const FOREIGN_KEYS: Record<string, Record<string, string>> = {
  categories: { parent_id: 'categories' },
  expenses: { category_id: 'categories', subcategory_id: 'categories', account_id: 'accounts' },
  income: { account_id: 'accounts' },
  category_budgets: { category_id: 'categories' },
  quick_add_templates: { category_id: 'categories', subcategory_id: 'categories' },
  recurring_expenses: { category_id: 'categories', subcategory_id: 'categories' },
  fund_transactions: { fund_id: 'funds', account_id: 'accounts' },
  project_transactions: { project_id: 'projects', account_id: 'accounts' },
  transfers: { from_account_id: 'accounts', to_account_id: 'accounts' },
};

const columnCache = new Map<string, string[]>();

/** Returns the column names of a table (cached; schema is static per process). */
export async function getColumns(table: string): Promise<string[]> {
  const cached = columnCache.get(table);
  if (cached) return cached;
  const info = await query<{ name: string }>(`PRAGMA table_info(${table})`);
  const cols = info.map((c) => c.name);
  columnCache.set(table, cols);
  return cols;
}

async function localIdToUuid(table: string, id: number): Promise<string | null> {
  const rows = await query<{ uuid: string }>(`SELECT uuid FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  return rows[0]?.uuid ?? null;
}

async function uuidToLocalId(table: string, uuid: string): Promise<number | null> {
  const rows = await query<{ id: number }>(`SELECT id FROM ${table} WHERE uuid = ? LIMIT 1`, [uuid]);
  return rows[0]?.id ?? null;
}

function bind(values: unknown[]): SqlBindValue[] {
  return values.map((v) => (v === undefined ? null : v)) as SqlBindValue[];
}

/** Converts a local row to its cloud shape: drop `id`/`sync_status`, FK ids → uuids. */
export async function toCloudRow(table: string, row: Row): Promise<Row> {
  const cloud: Row = { ...row };
  delete cloud.id;
  delete cloud.sync_status;
  const fks = FOREIGN_KEYS[table];
  if (fks) {
    for (const [col, refTable] of Object.entries(fks)) {
      const value = cloud[col];
      cloud[col] = value == null ? null : await localIdToUuid(refTable, value as number);
    }
  }
  return cloud;
}

/** Orders incoming rows so self-referential parents are applied before children. */
export function sortForInsert(table: string, rows: Row[]): Row[] {
  const fks = FOREIGN_KEYS[table];
  const selfCol = fks && Object.entries(fks).find(([, ref]) => ref === table)?.[0];
  if (!selfCol) return rows;
  return [...rows].sort((a, b) => (a[selfCol] == null ? 0 : 1) - (b[selfCol] == null ? 0 : 1));
}

/**
 * Applies a cloud row to the local table: FK uuids → local ids, then insert when
 * absent or overwrite when the cloud row is strictly newer (last-write-wins;
 * local breaks ties). Returns true when a write happened, false when the local
 * row was kept. Must run inside the sync guard so the dirty-marking triggers stay
 * suppressed (the row is already `synced`).
 */
export async function applyCloudRow(table: string, cloud: Row): Promise<boolean> {
  const translated: Row = { ...cloud };
  const fks = FOREIGN_KEYS[table];
  if (fks) {
    for (const [col, refTable] of Object.entries(fks)) {
      const value = translated[col];
      translated[col] = value == null ? null : await uuidToLocalId(refTable, value as string);
    }
  }

  const uuid = translated.uuid as string;
  const incomingUpdatedAt = (translated.updated_at as string) ?? '';
  const cols = (await getColumns(table)).filter((c) => c !== 'id');

  const existing = await query<{ updated_at: string | null }>(
    `SELECT updated_at FROM ${table} WHERE uuid = ? LIMIT 1`,
    [uuid],
  );

  // Only touch columns the cloud row actually carries (plus `sync_status`).
  // A column the cloud doesn't know about — e.g. one added by a newer local
  // migration than the cloud data was written under — is left out so its local
  // DEFAULT fills in on insert and it is never null-overwritten on update.
  const present = (c: string): boolean => c === 'sync_status' || translated[c] !== undefined;

  if (existing.length === 0) {
    const insertCols = cols.filter(present);
    const placeholders = insertCols.map(() => '?').join(', ');
    const values = insertCols.map((c) => (c === 'sync_status' ? 'synced' : translated[c]));
    await execute(
      `INSERT INTO ${table} (${insertCols.join(', ')}) VALUES (${placeholders})`,
      bind(values),
    );
    return true;
  }

  if (incomingUpdatedAt <= (existing[0].updated_at ?? '')) return false;

  const setCols = cols.filter((c) => c !== 'uuid' && present(c));
  const assignments = setCols.map((c) => `${c} = ?`).join(', ');
  const values = setCols.map((c) => (c === 'sync_status' ? 'synced' : translated[c]));
  await execute(`UPDATE ${table} SET ${assignments} WHERE uuid = ?`, bind([...values, uuid]));
  return true;
}
