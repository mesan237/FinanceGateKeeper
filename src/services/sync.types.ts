/** Outcome of a sync attempt. `ok` is false for not-signed-in and network errors. */
export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  lastSyncedAt: string | null;
  error?: string;
}

/** Why a cloud restore was refused or failed; data is untouched in every case. */
export type CloudRestoreError = 'not-signed-in' | 'cloud-error' | 'cloud-empty' | 'restore-failed';

/** Outcome of `restoreFromCloud`. Never thrown; `ok` is false with an `error` code. */
export interface CloudRestoreResult {
  ok: boolean;
  /** Rows written to this phone from the cloud. */
  restored: number;
  lastSyncedAt: string | null;
  error?: CloudRestoreError;
  /** The underlying error text, when there is one (e.g. the network failure). */
  message?: string;
}
