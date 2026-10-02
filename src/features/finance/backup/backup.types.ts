import type { SnapshotInfo } from '@/services/snapshots.types';

export type { SnapshotInfo, SnapshotReason } from '@/services/snapshots.types';
export type { CloudRestoreError, CloudRestoreResult } from '@/services/sync.types';

/** The action waiting on the confirm modal. Every restore and delete is confirmed first. */
export type PendingAction =
  | { kind: 'restore-snapshot'; snapshot: SnapshotInfo }
  | { kind: 'delete-snapshot'; snapshot: SnapshotInfo }
  | { kind: 'restore-cloud' };
