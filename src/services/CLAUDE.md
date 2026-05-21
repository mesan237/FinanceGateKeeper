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
- Local-first: all writes hit SQLite immediately. Supabase sync is background and non-blocking.
- Every synced table has `updated_at` and `sync_status` (synced | pending) columns.
- On push: send all records where `sync_status = pending` to Supabase, then mark synced.
- On pull: fetch records from Supabase where `updated_at > last_sync_timestamp`, upsert locally.
- Conflict resolution: local always wins (last-write-wins).
- Sync triggers: on app open (pull), after any write (push with debounce), manual "Sync Now".

## Import Rules
- This folder can import from `utils/`, `constants/`, `types/` only.
- NEVER import from `features/` or `app/`.
