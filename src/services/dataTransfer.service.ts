import { execute, query, type SqlBindValue } from '@/services/database';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';
import {
  ImportValidationError,
  type ExportPayload,
  type ImportSummary,
  type Row,
} from '@/services/dataTransfer.types';

const EXPORT_VERSION = 1;

/**
 * Dumps every row of every table in `SYNCED_TABLES` — the same scope cloud sync
 * already trusts — into a single portable snapshot. `users` (PIN hash/salt,
 * profile) is never included: it isn't part of `SYNCED_TABLES`, mirroring the
 * sync exclusion documented in `017_add_sync_metadata.ts`.
 */
export async function exportData(): Promise<ExportPayload> {
  const tables: ExportPayload['tables'] = {};
  for (const table of SYNCED_TABLES) {
    tables[table] = await query<Row>(`SELECT * FROM ${table}`);
  }
  return { version: EXPORT_VERSION, exportedAt: new Date().toISOString(), tables };
}

function assertValidPayload(payload: ExportPayload): void {
  if (payload.version !== EXPORT_VERSION) {
    throw new ImportValidationError('unsupported-version');
  }
  const knownTables: readonly string[] = SYNCED_TABLES;
  for (const table of Object.keys(payload.tables)) {
    if (!knownTables.includes(table)) {
      throw new ImportValidationError('unknown-table');
    }
  }
}

/**
 * Replaces all local data with the given snapshot: deletes every `SYNCED_TABLES`
 * row, then re-inserts the payload's rows verbatim (same `id`/`uuid`/`sync_status`
 * — a true restore, not a re-sync). Explicit-id inserts into an
 * `INTEGER PRIMARY KEY AUTOINCREMENT` column already advance SQLite's own
 * high-water mark, so a locally-created row after import can never collide with
 * a restored id. Validation runs before any write, so a rejected payload leaves
 * existing data untouched. The delete-then-restore pass runs inside a single
 * SQLite transaction — a malformed row partway through (e.g. a hand-edited
 * export file missing a required column) rolls the whole device back to its
 * pre-import state instead of leaving a half-wiped, half-restored database.
 * `PRAGMA foreign_keys` can only be toggled outside an active transaction, so
 * it is switched off before `BEGIN` and back on after the transaction closes.
 */
export async function importData(payload: ExportPayload): Promise<ImportSummary> {
  assertValidPayload(payload);

  const summary: ImportSummary = {};
  await execute('PRAGMA foreign_keys = OFF');
  try {
    await execute('BEGIN TRANSACTION');
    try {
      for (const table of [...SYNCED_TABLES].reverse()) {
        await execute(`DELETE FROM ${table}`);
      }
      for (const table of SYNCED_TABLES) {
        const rows = payload.tables[table];
        if (!rows || rows.length === 0) continue;

        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        for (const row of rows) {
          await execute(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            columns.map((c) => row[c]) as SqlBindValue[],
          );
        }
        summary[table] = rows.length;
      }
      await execute('COMMIT');
    } catch (e) {
      await execute('ROLLBACK');
      throw e;
    }
  } finally {
    await execute('PRAGMA foreign_keys = ON');
  }
  return summary;
}
