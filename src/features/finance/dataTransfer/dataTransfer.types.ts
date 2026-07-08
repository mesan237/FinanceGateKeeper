import type { ExportPayload, ImportSummary } from '@/services/dataTransfer.types';

export type { ExportPayload, ImportSummary };

/** A picked-but-not-yet-applied import file: parsed payload plus preview row counts. */
export interface PickedImport {
  payload: ExportPayload;
  summary: ImportSummary;
}

/** Screen-local confirm-flow state: nothing picked yet, previewing counts, or applying. */
export type ImportPhase = 'idle' | 'confirm' | 'busy';
