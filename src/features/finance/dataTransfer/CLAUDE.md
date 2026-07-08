# Data Transfer Feature Context

## Domain Responsibility
Local backup file export/import — a full-data snapshot the user can save or
share, independent of Supabase cloud sync. No own database tables.

## Data Scope
Reuses `SYNCED_TABLES` from `services/migrations/017_add_sync_metadata.ts` (the
same 14 tables cloud sync trusts) as the export/import scope. `users` (PIN
hash/salt, profile) is never included — it isn't in `SYNCED_TABLES`.

## Key Business Rules
- Export is non-destructive: dumps every `SYNCED_TABLES` row to a JSON file and
  opens the OS share sheet. No confirmation needed.
- Import is destructive: replaces **all** local data with the file's contents
  (delete-then-restore, not a merge). Always confirm-guarded — the screen shows
  per-table row counts and an irreversible-replace warning before applying.
- All file/share/picker I/O and the destructive-replace logic live in
  `services/dataTransfer.service.ts` (shared infra) — this slice only wraps it
  in hooks + UI.

## Files
- `DataTransferScreen.tsx` — Export section + Import section (pick → confirm →
  apply).
- `dataTransfer.hooks.ts` — `useExportData`, `useImportData`.
- `dataTransfer.types.ts` — `PickedImport`, `ImportPhase` (re-exports
  `ExportPayload`/`ImportSummary` from `services/dataTransfer.types.ts`).

## Cross-Feature Reads
None. No cross-feature imports (mirrors `accounts`/`categories` — imports only
shared infra).
