# ISSUE-015 — Phase 2 Implementation Plan (Supabase Cloud Backup & Sync)

Derived from `implementation-plan.md` (approved draft). Closest analogs: the **migration + trigger**
shape is new; the **service + in-memory-SQLite test** harness mirrors `projects`/`funds`; the
**root-mounted on-open side effect** mirrors `RecurringAutoLogger` / `DailyReminderScheduler`.

**Blockers:** VS-03 ✅, VS-05 ✅, VS-06 ✅. VS-02 is Backlog but **not a real dependency** — Decision 1
decouples the cloud identity (email/password) from the local PIN. No ARCHITECTURE/CLAUDE cross-feature
table change: every new edge is *feature → shared infra* (`auth → @/hooks/useCloudSync`), which is
always allowed.

---

## Build order (TDD — each test written red before its implementation)

### Subtask 0 — Test & dependency infrastructure (no app behaviour)
- **Install:** `npx expo install expo-secure-store` (sandbox disabled + `--legacy-peer-deps` per
  [[project-npm-install-quirks]]). `@supabase/supabase-js` already present.
- **`__mocks__/@supabase/supabase-js.js`** (new, repo root) — manual mock auto-applied to the node
  module. Exports `createClient()` returning an in-memory fake:
  - `from(table)` → chainable `{ upsert(rows,{onConflict}), select(), gt(col,val), eq(col,val) }`
    resolving against a module-level `Map<table, Map<uuid,row>>`; plus `__reset()` and `__seed()`
    test helpers.
  - `auth` → `signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange` over a
    mutable fake session; `__setSession()` / `__fail(next)` helpers.
- **`jest.setup.ts`** (modified) — seed dummy `process.env.EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` so `supabase.ts`'s import-time env guard doesn't throw in tests.
- *No test of its own — exercised by every later subtask.*

### Subtask 1 — Migration 017 (sync metadata + triggers) + `sync_meta`
- **Test (red):** `src/services/migrations/__tests__/017_add_sync_metadata.test.ts` — in-memory
  better-sqlite3 + `runMigrations(driver, migrations)` (the established harness). Cases = the 5
  migration anchors:
  1. every synced table gains `uuid` / `updated_at` / `sync_status`;
  2. insert stamps `updated_at` + `sync_status='pending'` + non-null `uuid`;
  3. data-column update re-stamps + re-marks `'pending'`;
  4. sync-only update (`sync_status→'synced'`) does **not** re-arm the trigger (loop guard);
  5. backfill gives every pre-existing row a unique `uuid`.
- **Impl:** `src/services/migrations/017_add_sync_metadata.ts` — for each table in `SYNCED_TABLES`
  (12 tables; **not** `users`): `ALTER ADD uuid/updated_at/sync_status`, backfill, unique uuid index +
  sync_status index, `AFTER INSERT` and `AFTER UPDATE OF <data-cols>` triggers (data-cols = all
  columns except `uuid/updated_at/sync_status`). Also `CREATE TABLE sync_meta(key TEXT PRIMARY KEY,
  value TEXT)`. Register as id 17 in `src/services/migrations/index.ts`.

### Subtask 2 — Supabase client + auth helpers
- **Test (red):** `src/services/__tests__/supabase.test.ts` (against the fake client): `signUp`
  resolves; `signIn` throws the error message on bad creds; `signOut` calls `auth.signOut`;
  `getCurrentUserId` → null when no session, id when present.
- **Impl:** `src/services/supabase.ts` (rewrite) — SecureStore storage adapter, `persistSession:true`,
  `autoRefreshToken:true`; export `signUp`, `signIn`, `signOut`, `getCurrentUserId`.

### Subtask 3 — Sync engine (the core)
- **Test (red):** `src/services/__tests__/sync.test.ts` — in-memory SQLite (real migrations incl. 017)
  + fake supabase client (mock `@/services/supabase` so `getCurrentUserId` is controllable). The 11
  sync anchors: push sends all pending + marks synced; none pending after; only pending sent; pull
  inserts cloud-only row; pull overwrites on newer `updated_at`; pull keeps local on older/equal;
  cursor respected (`gt`); FK uuid round-trip (expense→category); `syncNow` not-signed-in; `syncNow`
  network error returns `ok:false` (no throw), pending stays pending; full recovery from empty local DB.
- **Impl:** `src/services/sync.ts` — `SYNCED_TABLES` (FK-safe order, parents first), `pushChanges`,
  `pullChanges`, `syncNow`, `getLastSyncedAt`; `SyncResult` in `src/services/sync.types.ts`. If the
  file nears the 300-line cap, split the local-id↔uuid FK mapping into `src/services/sync.mapping.ts`
  (precedent: `budget.redistribution.ts`). Local upsert on pull writes `sync_status='synced'`
  directly (trigger-safe per Subtask 1 case 4).

### Subtask 4 — Shared hook `useCloudSync`
- **Test (red):** `src/hooks/__tests__/useCloudSync.test.ts` (mock `@/services/sync` +
  `@/services/supabase`): `signedIn` flips on sign-in; `syncNow` drives `status` syncing→idle +
  `lastSyncedAt`; error surfaces `status='error'`; `signOut` clears state.
- **Impl:** `src/hooks/useCloudSync.ts` (first file under `src/hooks/`) — wraps supabase auth + sync;
  shape per implementation-plan §5.

### Subtask 5 — Background sync on app open
- **Test (red):** `src/hooks/__tests__/useBackgroundSync.test.ts` (mock `@/services/sync` +
  `@/services/supabase`): pulls on mount when signed in; does **not** when signed out; re-runs
  `syncNow` on `AppState` → `active`.
- **Impl:** `src/hooks/useBackgroundSync.ts` — on mount (signed-in) `syncNow()`; subscribe to
  `AppState` and `syncNow()` on foreground. Mounted by calling the hook in `src/app/_layout.tsx`
  (the composition seam — see Design Decision 3). *Replaces the implementation-plan's tentative
  `services/SyncProvider.tsx`.*

### Subtask 6 — Settings "Cloud Backup" section
- **Test (red):** extend `src/features/finance/auth/__tests__/SettingsScreen.test.tsx` (mock
  `@/hooks/useCloudSync`): signed-out controls (email/password + Sign In/Create); signed-in controls
  (email, Sync Now, Sign Out); Sync Now calls hook; last-synced shown; error shown.
- **Impl:** `src/features/finance/auth/SettingsScreen.tsx` (modified) — new section consuming
  `useCloudSync()`; uses only `@/components/*`, `@/utils/formatDate`, `@/hooks/useCloudSync`. No
  `services/*` import from the feature layer → no forbidden edge.

### Subtask 7 — Supabase server schema (documentation)
- **Impl:** `docs/supabase-schema.sql` (new) — mirrors the 12 synced tables keyed by `uuid` + RLS
  scoped to `auth.uid()`. Applied manually in the dashboard; not run by the app, not Jest-covered
  (flagged Out of Scope).

### Subtask 8 — Gate & close
- `/check-arch` inline: no feature imports `services/sync`/`services/supabase`; `services/` imports
  only utils/constants/types; routes/layout stay logic-free.
- `code-reviewer` on the branch diff (watch the 300-line cap on `sync.ts`).
- Mark VS-15 `✅ Done` in `docs/KANBAN.md` with test count + migration 017.

---

## Scope-bullet → file map

| Issue scope bullet | Subtask | Files |
| --- | --- | --- |
| Set up Supabase project (schema, RLS) | 7 | `docs/supabase-schema.sql` (env already wired) |
| `supabase.ts` client + auth helpers | 2 | `src/services/supabase.ts` (+ test) |
| Mirror local tables in Supabase | 7 | `docs/supabase-schema.sql` |
| `sync.ts` local-first push/pull, LWW, per-record timestamps | 1,3 | migration 017, `sync.ts`, `sync.types.ts`(/`sync.mapping.ts`) |
| Sync triggers: on open / after write / manual | 5,6 | `useBackgroundSync.ts`, `_layout.tsx`, Sync Now in `SettingsScreen` |
| Data recovery flow (new device → pull) | 3 | `sync.pullChanges` (test #11) |
| Settings: account setup, status, Sync Now, last-synced | 4,6 | `useCloudSync.ts`, `SettingsScreen.tsx` |

---

## Files (≈3 modified, ≈9 new)

**New:** `__mocks__/@supabase/supabase-js.js`; `migrations/017_add_sync_metadata.ts` (+ test);
`services/sync.ts` (+ `sync.types.ts`, maybe `sync.mapping.ts`) (+ test); `services/__tests__/supabase.test.ts`;
`hooks/useCloudSync.ts` (+ test); `hooks/useBackgroundSync.ts` (+ test); `docs/supabase-schema.sql`.
**Modified:** `services/supabase.ts`, `services/migrations/index.ts`, `jest.setup.ts`,
`app/_layout.tsx`, `auth/SettingsScreen.tsx` (+ its test).

---

## Design decisions made during planning (with rejected alternatives)

1. **SQLite triggers mark rows dirty — not edits to all 11 feature services.** One migration owns the
   sync-marking contract for every current and future write path. The `AFTER UPDATE OF <data-cols>`
   form is what lets the pull-side `sync_status='synced'` write avoid re-arming the trigger (no
   push/pull loop). *Rejected:* touch every service's write calls — large cross-cutting diff that
   silently breaks the moment a new write path is added.

2. **A `uuid` column alongside the integer PK is the cloud key.** Two devices both start autoincrement
   at 1, so the integer id can't be the cloud identity; FK columns are mapped local-id↔uuid during
   push/pull. *Rejected:* server-assigned ids (needs a round-trip before every local write — breaks
   local-first/offline) and composite natural keys (no stable natural key on most tables).

3. **Background sync = a shared `useBackgroundSync` hook called in `_layout.tsx`; no `SyncProvider`
   component.** A React `.tsx` in `services/` violates the "services are non-React infra" convention,
   and a `components/` wrapper can't import `services/` (components → utils/constants/types only).
   `_layout.tsx` is already the composition seam (it bridges auth↔expenses) and shared hooks sit below
   features in the dependency order. *Rejected:* `services/SyncProvider.tsx` (the implementation-plan's
   tentative option) — awkward layering; and a debounced global write-bus — heavier than needed when
   on-open + on-foreground + manual already satisfy the scope.

4. **`SettingsScreen` reaches sync only through `@/hooks/useCloudSync` (shared infra).** Keeps the
   auth feature free of a `feature → services/sync` reach-through and introduces no cross-feature edge,
   so `/check-arch` stays clean. *Rejected:* import `services/sync` directly in the screen — works but
   muddies the feature/infra boundary and spreads sync state across the UI.

5. **`users` is excluded from sync** (settled in the approved draft, Decision 5) — device/settings
   state, not financial data; avoids shipping `pin_hash` to the cloud and clobbering the new device's
   `created_at`. *Rejected:* sync `users` with a `pin_hash` column filter — more surface, real
   `created_at` footgun, for a settings-restore feature that was never the VS-15 goal.

6. **Last-write-wins, local breaks ties** (per `services/CLAUDE.md`). Deterministic and correct for
   single-user/multi-device where true conflicts are rare. *Rejected:* field-level merge — large
   complexity for a scenario that essentially never produces real conflicts here.

7. **Supabase fully mocked in tests** (root manual mock + dummy env in `jest.setup.ts`). No network,
   no credentials in CI; mirrors VS-14's chart-kit mocking. *Rejected:* a live test project — flaky,
   slow, secret-dependent.

---

## Done when
All new test files green + full suite stays green; `/check-arch` clean (only *feature → shared infra*
edges); `code-reviewer` no unaddressed BLOCK; VS-15 marked ✅ Done. Issue-folder deletion left to the
user after on-device verification.
