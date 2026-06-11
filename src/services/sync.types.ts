/** Outcome of a sync attempt. `ok` is false for not-signed-in and network errors. */
export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  lastSyncedAt: string | null;
  error?: string;
}
