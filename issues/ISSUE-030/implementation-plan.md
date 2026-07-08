# ISSUE-030 — Export & Import Data (Local Backup File)

**Maps to:** KANBAN VS-32
**Priority:** Medium
**Blocked by:** none — all referenced tables/migrations already exist
**Audit refs:** none — user-requested feature, not from `docs/ux-audit/`

---

## Problem Statement

The drawer already advertises an **"Export records"** destination
([`AppDrawerContent.tsx:42`](../../src/components/AppDrawerContent.tsx#L42)), but it
renders disabled (`soon: true`) — there is no screen behind it. Today the only way
off-device data survives is Supabase cloud sync (VS-15), which requires signing in
to a cloud account and only covers 14 financial tables the sync engine already
tracks. There is no way to:

- take a manual, point-in-time snapshot of local data without a cloud account,
- move to a new device/reinstall by restoring a file directly, or
- get the raw data out of the app for inspection elsewhere.

The `Backup & Restore` drawer row is a **separate**, already-tracked concern
(VS-30 M5 — that row being disabled next to a working cloud sync is confusing) and
is **not** touched by this slice.

## User Stories

- **As a user**, I tap "Export records" in the drawer and get a single file with
  all my data that I can save or share (Drive, email, Files) — no cloud account
  required.
- **As a user**, I tap "Import," pick a previously exported file, see what it
  contains, confirm an irreversible-replace warning, and my device's data is fully
  restored to that snapshot.

## Scope

### New dependencies

- `expo-file-system` — write the export JSON to a local file.
- `expo-sharing` — open the OS share sheet on the written file.
- `expo-document-picker` — let the user pick a `.json` file to import.

None of these are installed yet (confirmed against `package.json`). Install with
`npx expo install expo-file-system expo-sharing expo-document-picker` so Expo
resolves SDK-matched versions. **Flag for checkpoint confirmation** — this is a new
native-module surface, worth a deliberate go-ahead before installing.

### New shared service — `src/services/dataTransfer.service.ts`

(Split into `export.service.ts` + `import.service.ts` if the combined file would
exceed the 300-line cap — mirrors the existing `sync.ts` / `sync.mapping.ts` split.)

- `exportData(): Promise<ExportPayload>` — for each table name in `SYNCED_TABLES`
  (imported from
  [`migrations/017_add_sync_metadata.ts`](../../src/services/migrations/017_add_sync_metadata.ts#L10),
  already ordered parents-first), run `SELECT * FROM <table>` and collect into:

  ```ts
  { version: 1, exportedAt: <ISO string>, tables: { [table: string]: Row[] } }
  ```

  Deliberately reuses `SYNCED_TABLES` as the single source of truth for "what is
  user data" instead of a hand-maintained list — see Design Decision #1. `users`
  is excluded because it isn't in `SYNCED_TABLES` (PIN hash/salt + profile stay
  device-local, same reasoning as the sync exclusion documented at
  [`017_add_sync_metadata.ts:7-8`](../../src/services/migrations/017_add_sync_metadata.ts#L7)).
  Returns the payload object; the caller (hook) handles `JSON.stringify` +
  `expo-file-system` write + `expo-sharing` share.

- `importData(payload: ExportPayload): Promise<ImportSummary>` — validates the
  shape first (`version === 1`; every key of `payload.tables` is a member of
  `SYNCED_TABLES`; reject otherwise with a typed error the UI can show) and then,
  inside one pass:
  1. `PRAGMA foreign_keys = OFF`.
  2. `DELETE FROM <table>` for every `SYNCED_TABLES` entry, **reverse** order
     (children before parents).
  3. Bulk `INSERT` the incoming rows, **forward** (parent-first) `SYNCED_TABLES`
     order, preserving every column verbatim — including `id`, `uuid`,
     `sync_status`, `updated_at`. This is a true snapshot restore, not a re-sync
     (see Design Decision #3).
  4. For each table, `UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM
     <table>) WHERE name = '<table>'` (tables use `INTEGER PRIMARY KEY
     AUTOINCREMENT`, confirmed at
     [`002_create_expenses_table.ts:15`](../../src/services/migrations/002_create_expenses_table.ts#L15))
     so the next locally-created row can't collide with a restored id.
  5. `PRAGMA foreign_keys = ON`.
  6. Return `{ [table]: rowCount }` for the confirmation UI.

  A table present in `SYNCED_TABLES` but absent from an older export file's
  `tables` object is simply left empty (skip its DELETE/INSERT) — lets an older
  export file still import cleanly against a newer schema.

- Both functions use `database.ts`'s `execute`/`query` (same as
  [`sync.mapping.ts`](../../src/services/sync.mapping.ts#L1)) — no new SQLite
  plumbing, no raw driver access from outside `services/`.

### New feature slice — `src/features/finance/dataTransfer/`

New slice rather than folding into `auth/SettingsScreen` — touches every domain
equally, same rationale as `accounts`/`categories` getting their own drawer-routed
slice instead of growing Settings (see Design Decision #4).

- `DataTransferScreen.tsx` — two sections:
  - **Export**: a button that calls `exportData()`, writes the JSON via
    `expo-file-system` to a cache-dir file, and opens the share sheet via
    `expo-sharing`.
  - **Import**: a button that opens `expo-document-picker`, reads + parses the
    picked file, shows a confirm modal with the per-table row counts and an
    irreversible-replace warning ("This replaces all data currently on this
    device. Consider exporting first."), and on confirm calls `importData()`,
    then shows a success toast.
- `dataTransfer.hooks.ts` — thin wrappers: `useExportData()` / `useImportData()`
  exposing `{ run, isLoading, error }` (mirrors existing hook shapes, e.g.
  `useCloudSync`).
- No migration.

### Modify — `src/components/AppDrawerContent.tsx`

- Row `{ label: 'Export records', icon: 'export', soon: true }`
  ([`:42`](../../src/components/AppDrawerContent.tsx#L42)) →
  `{ label: 'Export & Import', icon: 'export', route: '/data-transfer' }`.
  **Confirm at the checkpoint:** one combined row/screen (proposed) vs. two
  separate drawer rows ("Export records" + "Import data").
- `Backup & Restore` row is untouched.

### New route — `src/app/data-transfer.tsx`

- Thin route rendering `<DataTransferScreen />`, mirrors
  [`app/accounts/index.tsx`](../../src/app/accounts/index.tsx).

## Scope Bullet → File Map

| KANBAN Scope bullet | Concrete change |
| --- | --- |
| `services/dataTransfer.service.ts` — dump/restore every `SYNCED_TABLES` row | **new** `src/services/dataTransfer.service.ts` (or `export.service.ts` + `import.service.ts`) |
| New file/share/picker dependencies | `package.json` — `expo-file-system`, `expo-sharing`, `expo-document-picker` |
| New feature slice `features/finance/dataTransfer/` | **new** `src/features/finance/dataTransfer/DataTransferScreen.tsx`, `dataTransfer.hooks.ts`, `dataTransfer.types.ts` (payload/summary types) |
| New route `app/data-transfer.tsx`; drawer row goes live | **new** `src/app/data-transfer.tsx`; modify `src/components/AppDrawerContent.tsx` |

## TDD Anchors → Test Files

| KANBAN TDD Anchor | Test file | Assertion |
| --- | --- | --- |
| `exportData` dumps every `SYNCED_TABLES` row and excludes `users` | **new** `src/services/__tests__/dataTransfer.service.test.ts` | Against an in-memory db seeded across several tables (categories, expenses, income, accounts), `exportData()` returns a `tables` object with exactly the `SYNCED_TABLES` keys, each containing all seeded rows; `users` never appears as a key. |
| Round-trip restores identical row counts and FK relationships | same file | Export a populated db, `importData()` the payload into a **different** in-memory db pre-seeded with default rows (fresh-install shape); assert per-table row counts match the export and an expense's `category_id` still resolves to the same category name post-restore. |
| `importData` rejects an unknown version or an out-of-scope table name | same file | `importData({ version: 2, ... })` and `importData({ version: 1, tables: { not_a_real_table: [] } })` both reject with a typed error; no rows are deleted (verify a pre-existing row survives the rejected call). |
| Restored ids don't collide with new inserts | same file | After `importData()`, inserting a new row into a restored table (e.g. a new expense) gets an `id` greater than any id in the imported payload. |
| Drawer Export row is no longer disabled and navigates | modify `src/components/__tests__/AppDrawerContent.test.tsx` | The "Export & Import" row has no `Soon` tag and is not `disabled`; pressing it calls `router.push('/data-transfer')`. |
| `DataTransferScreen` export/import flows | **new** `src/features/finance/dataTransfer/__tests__/DataTransferScreen.test.tsx` | Export button triggers `exportData` + a file write + share-sheet call. Import button → mocked picker result → confirm modal renders row counts → confirming calls `importData`; dismissing the modal makes no service call. |

## Acceptance Check (Done When)

1. **Export produces a shareable file.** Tapping Export writes a JSON file
   containing every `SYNCED_TABLES` row and opens the OS share sheet. →
   `dataTransfer.service.test.ts` + `DataTransferScreen.test.tsx`.
2. **Import fully restores a snapshot.** Given a previously exported file, Import
   (after a confirm-guarded warning) restores identical data — row-for-row,
   relationships intact. → `dataTransfer.service.test.ts`.
3. **`users` never leaves the device.** The export file never contains PIN
   hash/salt or profile data. → `dataTransfer.service.test.ts`.
4. **No cloud account required.** Both flows work fully offline / signed out of
   Supabase.
5. **Suite + `tsc` + `/check-arch` clean.** `npm test` green, `tsc` clean,
   `/check-arch` reports no new cross-feature edge (`dataTransfer` imports only
   `@/services`, `@/components`, `@/theme`, `@/constants` — same shape as
   `accounts`).

## Design Decisions

1. **Reuse `SYNCED_TABLES` as the export scope**, not a hand-maintained parallel
   list. A table added to sync in the future automatically gets export/import
   coverage; drift between "what syncs" and "what's backed up" would otherwise be
   a silent bug. *Rejected alt:* a separate `EXPORT_TABLES` constant — needless
   duplication for a rule (user data vs. device-local `users`) that should always
   match sync's split.
2. **Import replaces all local data (delete-then-restore), not a merge.**
   *Rejected alt:* uuid-aware merge using `sync.mapping.ts`'s `applyCloudRow`
   logic — that machinery reconciles two *independently edited* datasets; import
   restores a *point-in-time snapshot* of the same dataset, so merge semantics
   would silently blend two backups instead of giving the user exactly the file's
   contents. Destructive-replace matches the existing `resetLocalData` precedent
   (`database.ts:158` — the PIN-recovery wipe) for "irreversible, confirm-guarded"
   local data operations in this app.
3. **Preserve `id`/`uuid`/`sync_status`/`updated_at` verbatim on import** rather
   than re-minting uuids and marking every row pending. Keeps a restore-then-sync
   round-trip inert when restoring onto the same cloud-linked account; if the
   export predates the current cloud state, normal last-write-wins reconciliation
   (already built) still applies on the next sync — no special-casing needed here.
4. **New dedicated `dataTransfer` feature slice + drawer route**, not folded into
   `auth/SettingsScreen`. Matches the existing pattern where cross-cutting but
   non-account destinations (Accounts, Categories) get their own slice and drawer
   row rather than growing Settings indefinitely.

## Out of Scope (Deferred)

- CSV export (flattens relational data — JSON is the only supported format for
  now; could revisit as an additional "spreadsheet-friendly" export later).
- Partial/selective export (e.g. "just expenses") — full snapshot only.
- Automatic/scheduled export — manual trigger only.
- Cross-device import *merge* — see Design Decision #2.
- Wiring the "Backup & Restore" drawer row — VS-30's scope.
- Encrypting the export file — it contains financial records in plain JSON;
  revisit if this becomes a concern (the PIN hash is already excluded).

## After This Slice

1. `npx expo install expo-file-system expo-sharing expo-document-picker`.
2. `/check-arch` — confirm no new cross-feature edges.
3. `code-reviewer` subagent on the branch diff; address any `BLOCK` findings.
4. On-device verification: Export → confirm a file appears in the share sheet
   with plausible content → (reset or use a second device) Import that file →
   confirm all records return, including FK-linked rows (an expense still shows
   its category, a fund transaction still shows its fund).
5. Mark VS-32 `✅ Done` in `docs/KANBAN.md` with the test count.
6. Delete `issues/ISSUE-030/` after verification.
