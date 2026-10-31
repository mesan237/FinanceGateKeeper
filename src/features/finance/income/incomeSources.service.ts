import i18n from 'i18next';

import { isIncomeSourceKey, labelForIncomeSource } from '@/constants/incomeSources';
import { execute, query } from '@/services/database';

import type { IncomeSource } from './income.types';

type SourceError = 'sourceNameRequired' | 'sourceNameTaken' | 'sourceNotFound' | 'sourceTooDeep' | 'sourceBuiltIn';

/** A validation message in the active UI language — thrown errors reach the screen as-is. */
function err(key: SourceError, params?: Record<string, string>): string {
  return i18n.t(`errors.${key}`, { ns: 'income', ...params });
}

interface SourceRow {
  id: number;
  key: string | null;
  name: string;
  parent_id: number | null;
  is_hidden: number;
  sort_order: number;
}

function mapSource(row: SourceRow): IncomeSource {
  return {
    id: row.id,
    key: row.key !== null && isIncomeSourceKey(row.key) ? row.key : null,
    name: row.name,
    parentId: row.parent_id,
    isHidden: row.is_hidden === 1,
    sortOrder: row.sort_order,
  };
}

const SOURCE_COLUMNS = 'id, key, name, parent_id, is_hidden, sort_order';

/**
 * Returns every income source, hidden ones included: top-level sources first,
 * then subsources, each group by `sort_order` then id (oldest first).
 */
export async function getIncomeSources(): Promise<IncomeSource[]> {
  const rows = await query<SourceRow>(
    `SELECT ${SOURCE_COLUMNS} FROM income_sources
     ORDER BY parent_id IS NOT NULL, sort_order, id`,
  );
  return rows.map(mapSource);
}

async function getSource(id: number): Promise<IncomeSource | null> {
  const [row] = await query<SourceRow>(`SELECT ${SOURCE_COLUMNS} FROM income_sources WHERE id = ?`, [id]);
  return row ? mapSource(row) : null;
}

/** Returns true when an income source with this id exists. */
export async function incomeSourceExists(id: number): Promise<boolean> {
  return (await getSource(id)) !== null;
}

/**
 * Trims `name` and checks it is not empty and that no sibling (same parent,
 * hidden ones included) shows the same label, ignoring case. `selfId` is left
 * out of the check so a rename may keep its own name.
 */
async function validName(name: string, parentId: number | null, selfId: number | null): Promise<string> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error(err('sourceNameRequired'));
  const siblings = await query<SourceRow>(
    `SELECT ${SOURCE_COLUMNS} FROM income_sources WHERE parent_id IS ?`,
    [parentId],
  );
  const wanted = trimmed.toLocaleLowerCase();
  const taken = siblings.some(
    (s) => s.id !== selfId && labelForIncomeSource(s.key, s.name).toLocaleLowerCase() === wanted,
  );
  if (taken) throw new Error(err('sourceNameTaken', { name: trimmed }));
  return trimmed;
}

/**
 * Adds a source of the user's own, top-level (`parentId` null) or under a
 * top-level source, placed after its siblings. Returns the new id.
 *
 * @throws if the name is empty or a sibling has it, or the parent is missing or is itself a subsource.
 */
export async function createIncomeSource(name: string, parentId: number | null): Promise<number> {
  if (parentId !== null) {
    const parent = await getSource(parentId);
    if (!parent) throw new Error(err('sourceNotFound'));
    if (parent.parentId !== null) throw new Error(err('sourceTooDeep'));
  }
  const trimmed = await validName(name, parentId, null);
  const [{ next }] = await query<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM income_sources WHERE parent_id IS ?',
    [parentId],
  );
  await execute(
    'INSERT INTO income_sources (name, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?)',
    [trimmed, parentId, next, new Date().toISOString()],
  );
  const [row] = await query<{ id: number }>('SELECT last_insert_rowid() AS id');
  return row.id;
}

/**
 * Renames a source the user made. Built-in sources keep their name, which
 * follows the app language; they can only be hidden.
 *
 * @throws if the source is missing or built-in, or the name is empty or taken.
 */
export async function renameIncomeSource(id: number, name: string): Promise<void> {
  const source = await getSource(id);
  if (!source) throw new Error(err('sourceNotFound'));
  if (source.key !== null) throw new Error(err('sourceBuiltIn'));
  const trimmed = await validName(name, source.parentId, id);
  await execute('UPDATE income_sources SET name = ? WHERE id = ?', [trimmed, id]);
}

/**
 * Hides a source from the picker, or shows it again. Income already logged on
 * it keeps it; a hidden top-level source hides its subsources with it.
 */
export async function setIncomeSourceHidden(id: number, hidden: boolean): Promise<void> {
  await execute('UPDATE income_sources SET is_hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
}
