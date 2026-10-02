# Backup Feature Context

## Domain Responsibility
The Backup & Restore screen (VS-37): the cloud backup (status, back up now,
restore from cloud) and automatic on-phone snapshots. No own database tables;
snapshots are JSON files in the app's private `documents/backups` folder.

## Key Business Rules
- A daily snapshot is taken on the first open of each (UTC) day by
  `hooks/useDailySnapshot`, mounted in the root layout. The 7 newest daily
  snapshots are kept; manual and "before restore" ones are capped separately
  at 5, so the daily rotation never deletes a safety copy.
- Every restore first saves a "before restore" snapshot, so it can be undone
  from the same list. Every restore and delete is confirm-guarded.
- A snapshot restore marks every row pending with a fresh `updated_at`, so the
  cloud converges on the next sync. Cloud-only rows stay in the cloud (the sync
  engine sends no deletions); the confirm modal says so when signed in.
- Restore from cloud replaces local data (not a merge) and refuses, leaving the
  phone untouched, when signed out, offline or the cloud backup is empty.
- All file and data logic lives in `services/snapshots.service.ts` and
  `services/sync.ts` (`restoreFromCloud`); this slice wraps them in hooks + UI.

## Files
- `BackupScreen.tsx` — composes the two cards and the confirm modal.
- `CloudBackupCard.tsx` — the only home of the cloud account, via
  `hooks/useCloudSync`: sign-in/sign-up form when signed out; back up now,
  restore from cloud and sign out when signed in.
- `SnapshotList.tsx` — "Take a snapshot now" and the snapshot rows.
- `ConfirmActionModal.tsx` — what a restore or delete will change.
- `backup.hooks.ts` — `useSnapshots`, `useCloudRestore`.
- `backup.types.ts` — `PendingAction`; re-exports the service types.

## Cross-Feature Reads
None. Shared infra only.
