import type { SyncedTable } from '@/services/migrations/017_add_sync_metadata';

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
      reason === 'unsupported-version'
        ? 'This backup file was made by a newer or incompatible version of the app.'
        : 'This backup file contains data this app does not recognize.',
    );
    this.name = 'ImportValidationError';
  }
}
