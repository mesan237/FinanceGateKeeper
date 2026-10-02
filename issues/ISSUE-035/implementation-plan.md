# ISSUE-035 — VS-37: Backup & Restore

## Problem Statement

The drawer has carried a disabled "Backup & Restore — Soon" row since VS-30, next
to a cloud sync that already works. The UX audit called that out as confusing.
The pieces exist, but they're scattered and incomplete:

- **Cloud sync (VS-15)** runs by itself on open and on foreground, and has a "Sync
  now" button inside a Cloud backup card in Settings and Profile. It only
  *merges*. There's no way to say "replace this phone's data with my cloud copy",
  and a new phone only recovers if sign-in happens to pull everything.
- **Export & Import (VS-32)** is a manual file the user has to remember to make.
- **Nothing protects against a mistake on the phone itself.** A bad import, a
  wrong bulk edit, or a reset leaves no way back unless a file was exported first.

## Product Decisions (confirmed)

1. **One Backup & Restore screen**, reached from the drawer row (made live). It
   has two parts:
   - **Cloud backup:** sign-in state, last backup time, *Back up now*, and
     *Restore from cloud*, which replaces this phone's data with the cloud copy.
   - **On this phone:** automatic snapshots listed newest first, each restorable
     in one tap without internet, plus *Back up now* to take one manually.
2. **Automatic local snapshots: daily, keep the last 7.** One snapshot is taken on
   the first app open of a day, and older ones beyond 7 are pruned.
3. **Every restore is reversible.** Restoring (from the cloud or from a snapshot)
   first takes a fresh "before restore" snapshot, so the step can be undone from
   the same list.

## The consequence that isn't obvious

**The sync engine never sends deletions.** `pushChanges` upserts pending rows, and
nothing deletes in the cloud. So:

- **Restoring a local snapshot while signed in** would leave the phone and the
  cloud silently diverged. Restored rows keep their old `sync_status = 'synced'`
  and old `updated_at`, so they're never pushed, and the pull cursor is already
  past the cloud's newer versions. **Resolution:** after a snapshot restore,
  every restored row is marked `pending` with `updated_at = now`, so the next
  sync pushes it and it wins last-write-wins. Rows that exist only in the cloud
  (created after the snapshot) stay in the cloud, matching how deletes already
  behave. A later *Restore from cloud* would bring them back. The confirm dialog
  says so in plain words.
- **Restore from cloud** clears the local synced tables (inside one transaction,
  with the sync guard raised so the dirty-marking triggers stay quiet), resets the
  pull cursor to the epoch, and pulls everything. Local changes that were never
  pushed are lost, which is why the "before restore" snapshot comes first.

No schema change: snapshots are files, and the snapshot list is read from the
folder.

## Design

### Shared infra — `services/`

- `services/snapshots.service.ts` (new)
  - `createSnapshot(reason: 'daily' | 'manual' | 'before-restore', now?)`: writes
    `exportData()` JSON to `Paths.document/backups/snapshot-<ISO>-<reason>.json`.
  - `listSnapshots()`: returns `{ id, createdAt, reason, rowCount, sizeBytes }[]`,
    newest first, read from the file names plus a small header in the JSON.
  - `restoreSnapshot(id)`: takes a "before restore" snapshot, runs
    `importData(payload)`, then marks the restored rows `pending` (see above).
  - `ensureDailySnapshot(today)`: creates a daily snapshot if none exists for
    today, then prunes. Pruning keeps the 7 newest *daily* snapshots; manual and
    "before restore" ones are capped separately at 5, so automatic rotation never
    deletes a safety copy straight away.
  - `deleteSnapshot(id)`.
- `services/sync.ts`: adds `restoreFromCloud()`, which takes a "before restore"
  snapshot, then clears, resets the cursor and pulls fully. It returns a
  `SyncResult`-like outcome, never throws, and refuses when signed out.
- `services/dataTransfer.service.ts`: gains a `markAllPending()` helper next to
  `importData`, so both restore paths share it.

### Shared hook — `hooks/useDailySnapshot.ts`

Mounted once in `app/_layout.tsx` beside `useBackgroundSync`, after unlock (so
migrations have run). It calls `ensureDailySnapshot(today)` on open and on
foreground. It's best-effort and never blocks render.

### Feature slice — `features/finance/backup/`

- `BackupScreen.tsx`: the Cloud backup card plus the snapshot list.
  - Signed out, the cloud card links to Settings to sign in. The backup slice
    can't import `auth`'s `CloudAccountCard` (that would be a new cross-feature
    edge), so it reads `hooks/useCloudSync` directly.
  - Every restore goes through a confirm modal that spells out what changes.
- `backup.hooks.ts`: `useSnapshots()` (list, create, restore, delete, refresh)
  and `useCloudRestore()`.
- `backup.types.ts`.
- Route `app/backup.tsx`; the drawer row `backupRestore` becomes live
  (`/backup`).
- i18n: new `backup` namespace in en and fr.
- **No new cross-feature edges**: the slice uses only shared infra.

## Milestones

| #  | Scope | Tests (written first) |
|----|-------|-----------------------|
| M1 | `snapshots.service` (create, list, prune, delete, `ensureDailySnapshot`) and an extended `expo-file-system` Jest mock (`Directory.list`, `delete`, `size`) | creates one per day only; prunes to 7 daily while sparing safety copies; lists newest first with row counts; ignores foreign files in the folder |
| M2 | `restoreSnapshot`, `markAllPending`, `restoreFromCloud` | snapshot restore replaces data and leaves every row pending with a fresh `updated_at`; a "before restore" snapshot appears first; cloud restore clears, resets the cursor and repopulates from the mocked Supabase; it refuses when signed out and leaves data untouched on a cloud error (in-memory SQLite) |
| M3 | `useDailySnapshot` plus root-layout mount | runs on mount and on foreground; never throws |
| M4 | `backup` slice: screen, hooks, route, live drawer row, en/fr catalogue | screen lists snapshots and restores through the confirm modal; signed-out cloud card links to Settings; drawer row navigates to `/backup`; French smoke test |
| M5 | `/check-arch`, `code-reviewer`, KANBAN | — |

## Out of Scope

- Sending deletions to the cloud, a separate sync-engine change.
- Copying snapshots off the phone automatically. Export & Import (VS-32) still
  covers sharing a file.
- Encrypting snapshots. They live in the app's private documents folder, which
  other apps can't read.

## Risks

- **Storage:** a snapshot is the full JSON of every synced table. For a single
  user's data that's tens to hundreds of KB, so 7 dailies plus 5 safety copies is
  negligible. The screen shows each snapshot's size.
- **App-uninstall wipes local snapshots.** The screen says that cloud backup is
  what survives losing the phone.
