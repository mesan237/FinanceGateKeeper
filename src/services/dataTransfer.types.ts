import i18n from 'i18next';

import { SYNCED_TABLES, type SyncedTable } from '@/services/migrations/017_add_sync_metadata';

/** Narrows a table name (e.g. an import file's key) to a known synced table. */
export function isSyncedTable(table: string): table is SyncedTable {
  return (SYNCED_TABLES as ReadonlyArray<string>).includes(table);
}

/** A database row as a plain column→value bag (mirrors `sync.mapping.ts`'s `Row`). */
export type Row = Record<string, unknown>;

/** The on-disk shape of an export file: every `SYNCED_TABLES` table's rows, verbatim. */
export interface ExportPayload {
  version: 1;
  exportedAt: string;
  tables: Partial<Record<SyncedTable, Row[]>>;
}

/** Per-table row counts restored by `importData`, used for the confirm/success UI. */
export type ImportSummary = Partial<Record<SyncedTable, number>>;

/** Thrown by `importData` when the payload fails validation before any data is touched. */
export class ImportValidationError extends Error {
  constructor(public readonly reason: 'unsupported-version' | 'unknown-table') {
    super(
      i18n.t(reason === 'unsupported-version' ? 'invalidVersion' : 'invalidTable', {
        ns: 'dataTransfer',
      }),
    );
    this.name = 'ImportValidationError';
  }
}
