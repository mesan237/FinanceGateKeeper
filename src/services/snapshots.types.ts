import type { ExportPayload } from '@/services/dataTransfer.types';

/** Why a snapshot was taken. Only `daily` ones rotate on the 7-day schedule. */
export type SnapshotReason = 'daily' | 'manual' | 'before-restore';

/** One local snapshot, as listed on the Backup & Restore screen. */
export interface SnapshotInfo {
  /** The snapshot's file name; the handle every other call takes. */
  id: string;
  /** ISO timestamp the snapshot was taken at. */
  createdAt: string;
  reason: SnapshotReason;
  /** Total rows across every table in the snapshot. */
  rowCount: number;
  sizeBytes: number;
}

/** A snapshot file: an Export & Import payload plus a small header for the list. */
export interface SnapshotFile extends ExportPayload {
  snapshot: { reason: SnapshotReason; rowCount: number };
}
