# Services Context (Shared Infrastructure)

## Responsibility
External service clients and database infrastructure. No business logic — only connection management, query execution, and sync mechanics.

## Structure
```
services/
├── database.ts        — SQLite connection, migration runner, query helpers
├── supabase.ts        — Supabase client init, auth helpers
├── sync.ts            — Local-to-cloud sync logic
└── migrations/
    ├── 001_create_tables.ts
    ├── 002_seed_defaults.ts
    └── ...
```

## Database Rules
- Use `expo-sqlite` with synchronous API for reads, async for writes.
- All tables use integer primary keys with autoincrement.
- Amounts are stored as integers (FCFA has no decimals).
- Dates stored as ISO 8601 strings (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss).
- Migrations run in numeric order on app startup. Track completed migrations in a `_migrations` table.
- Feature services call `database.ts` helper functions — never raw SQL from outside this folder.

## Database Helpers to Expose
- `db.execute(sql, params)` — Run a write query.
- `db.query<T>(sql, params)` — Run a read query, return typed rows.
- `db.runMigrations()` — Execute all pending migrations.
- `db.getConnection()` — Return the raw connection (only for in-memory test instances).

## Sync Rules (Supabase)
Implemented in VS-15 — full detail in [docs/CLOUD-SYNC.md](../../docs/CLOUD-SYNC.md).
- Local-first: all writes hit SQLite immediately. Supabase sync is background and non-blocking.
- Every synced table has `uuid` (the cloud key), `updated_at`, and `sync_status` (synced | pending)
  columns. `sync_status` is set to pending by SQLite triggers (`017_add_sync_metadata`), not by edits
  to feature services. The integer `id` stays local-only; foreign keys travel as uuids.
- On push: send all records where `sync_status = pending` to Supabase (FK ids → uuids), then mark
  synced only rows whose `updated_at` is unchanged. Never write `updated_at` from app code: the update
  trigger reads a statement that sets it as a sync write and does not mark the row pending.
- On pull: fetch records where `updated_at > lastPulledAt` (cursor in `sync_meta`), upsert locally
  (uuids → FK ids) when the incoming row is strictly newer.
- Conflict resolution: local always wins (last-write-wins; local breaks ties).
- Sync triggers: on app open and foreground (`useBackgroundSync`) and manual "Sync Now". `users` is
  excluded from sync.
- `restoreFromCloud` replaces local data with the cloud copy (VS-37). `snapshots.service.ts` keeps
  daily on-phone snapshots; restoring one calls `markAllPending` so the cloud converges, since the
  engine never sends deletions.
- First sync on a fresh or reset phone (no `lastPulledAt`, only seeded categories/accounts locally):
  `syncNow` restores a non-empty cloud backup instead of pushing. The seeded accounts carry random
  uuids, so pushing them first would duplicate every account and overwrite edited default categories.
  A phone that already holds its own records still merges (push, then pull).

## Import Rules
- This folder can import from `utils/`, `constants/`, `types/` only.
- NEVER import from `features/` or `app/`.
