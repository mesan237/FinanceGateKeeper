# ISSUE-015 — Supabase Cloud Backup & Sync

**Maps to:** KANBAN VS-15
**Priority:** Medium
**Blocked by (stated):** VS-02, VS-03 (✅), VS-05 (✅), VS-06 (✅)
**Blocker note:** VS-02 (PIN Auth) is still in Backlog. See Scope Decision 1 — this slice
decouples the Supabase identity from the local PIN, so VS-02 is **not** a hard prerequisite and VS-15
can proceed now.

---

## Scope Decisions (settled before drafting)

**1. Supabase identity is an email/password account, fully decoupled from the local PIN.**
The kanban left "tied to PIN or separate?" open, and VS-02 (the PIN gate) isn't built yet. Decision:
the cloud account is a Supabase **email + password** the user enters once in Settings. The local PIN
stays a device-only lock (VS-02's concern); the email/password is the cloud identity used for backup
and cross-device recovery. This removes the VS-02 dependency entirely and makes "lost phone → new
phone → re-enter credentials → restore" work without any PIN linkage. Credentials are never stored in
plaintext — the Supabase session token is persisted via `expo-secure-store`.

**2. Per-record sync metadata lives in columns on each synced table.**
Per `services/CLAUDE.md` ("Every synced table has `updated_at` and `sync_status` columns"), migration
017 adds `updated_at TEXT` and `sync_status TEXT NOT NULL DEFAULT 'pending'` to every synced table.
No central mapping table. `sync_status` is the closed enum `'synced' | 'pending'`.

**3. Sync marking is done by SQLite triggers, not by editing every feature service.**
Touching all eleven feature services to set `sync_status = 'pending'` on every write would be a
large, error-prone cross-cutting change and would risk drift the moment a new write path is added.
Instead, migration 017 installs `AFTER INSERT` and `AFTER UPDATE OF <data columns>` triggers per
table that stamp `updated_at` and set `sync_status = 'pending'`. Because the `AFTER UPDATE` trigger
fires only when **data** columns change (not when `sync_status`/`updated_at` themselves change), the
pull-side upsert can write `sync_status = 'synced'` without re-arming the trigger — no recursion, no
push/pull loop. Feature services stay untouched.

**4. Sync engine is local-first and last-write-wins, with local as the tiebreaker.**
All writes already hit SQLite first (existing behaviour). `syncNow()` does **push then pull**:
- **Push:** select rows where `sync_status = 'pending'` per table, upsert to Supabase, mark `'synced'`.
- **Pull:** fetch rows where `updated_at > lastPulledAt` per table, upsert locally **only if** the
  incoming `updated_at` is newer than the local row's `updated_at`; equal/older incoming rows are
  skipped (local wins on ties).
- After a successful pull, persist the max server `updated_at` seen as the new `lastPulledAt`.

**5. Synced tables are the financial-data tables; `users` and `_migrations` are never synced.**
The registry (`SYNCED_TABLES` in `sync.ts`) covers: `categories`, `expenses`, `income`,
`allocations`, `funds`, `fund_transactions`, `projects`, `project_transactions`, `debts`,
`quick_add_templates`, `recurring_expenses`, `zero_days`. The kanban's illustrative list of ten is
extended to include the two transaction-ledger tables and `zero_days` so history and zero-day
confirmations survive a restore. **`users` is deliberately excluded** — it holds device/settings
state (`pin_hash`, `app_mode`, `reminder_time`, `notifications_enabled`, `action_bar_style`,
`created_at`), none of which is the financial data the recovery story is about. Syncing it would ship
the PIN hash to the cloud for no benefit and would clobber the new device's first-run `created_at`,
mis-firing the `isMonth1Complete` learning→control nudge. `_migrations` (local schema bookkeeping) is
also excluded — schema is rebuilt by the migration runner on the new device, not synced.

**6. Rows are keyed by a stable UUID, not the local autoincrement id.**
Two devices both start their `expenses.id` at 1, so the integer PK cannot be the cloud key. Migration
017 adds a `uuid TEXT` column (unique) to every synced table, backfilled for existing rows. The
Supabase tables are keyed by `uuid`. Local autoincrement `id` stays the in-app foreign-key currency;
`uuid` is the sync currency. Foreign keys (e.g. `expenses.category_id`) are mapped through a
local-id↔uuid lookup during push/pull so relationships survive across devices.

**7. Supabase is mocked in all tests — the network is never hit.**
`__mocks__/@supabase/supabase-js.js` (or a per-test `jest.mock`) provides an in-memory fake client
with `from().upsert()`, `from().select()`, and `auth.*` stubs. Sync logic is tested against the
in-memory SQLite instance + the fake client. This matches the VS-14 chart-mock pattern.

**8. No automatic background sync daemon — three explicit triggers only.**
Pull on app open, debounced push after writes, and a manual "Sync Now" button. The debounced push is
a lightweight root-mounted component (`SyncProvider`) that calls `syncNow()` at most once per N
seconds; it is not a long-running timer. Keeping triggers explicit keeps the slice testable and
avoids draining battery.

**9. Sign-in/out and sync status are surfaced in the existing `SettingsScreen`.**
No new tab. `SettingsScreen` (owned by the auth feature) gains a "Cloud Backup" section. To avoid an
`auth → sync` or `auth → services/sync` violation, the section consumes a new `useCloudSync()` hook
that lives in **shared infra** (`hooks/useCloudSync.ts`), wrapping `services/sync.ts` and
`services/supabase.ts`. Shared infra is importable from any feature, so no cross-feature edge is
introduced.

---

## Problem Statement

All data lives only in on-device SQLite. If the phone is lost, reset, or replaced, every expense,
income record, budget, fund, project, and debt entry is gone — there is no backup and no recovery
path. VS-15 adds a local-first cloud backup: writes continue to hit SQLite immediately, then sync to
Supabase in the background. On a fresh install, the user signs in and pulls their data back.

---

## User Stories

- **As the user,** I can create or sign in to a cloud account from Settings so my data is backed up.
- **As the user,** my expenses/income/etc. sync to the cloud automatically after I log them, without
  blocking the UI.
- **As the user,** I can tap "Sync Now" and see a last-synced timestamp and a synced/pending status.
- **As the user,** I keep logging while offline; when I'm back online the pending changes push on the
  next sync.
- **As the user,** I set up a new phone, sign in with the same credentials, and all my data is
  restored.
- **As the user,** if the same record was edited on two devices, the most recent edit wins.

---

## Scope

Files are listed in TDD order — tests before implementation, data/schema layer before sync engine
before UI.

---

### 1. Install step (before first code)

```
npx expo install expo-secure-store
```

`@supabase/supabase-js` (^2.108.0) is already a dependency. `expo-secure-store` backs the auth-session
storage adapter so the Supabase session survives app restarts without storing the password.

Add to the jest config `moduleNameMapper` (so the real client never loads in tests):
```json
"@supabase/supabase-js": "<rootDir>/__mocks__/@supabase/supabase-js.js"
```

Create `__mocks__/@supabase/supabase-js.js` — an in-memory fake exporting `createClient()` returning
`{ from, auth }` where:
- `from(table)` exposes chainable `.upsert(rows)`, `.select()`, `.gt('updated_at', ts)`, `.eq(...)`
  resolving against an in-memory `Map<table, Map<uuid, row>>`.
- `auth` exposes `signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`.
Tests reset the fake's store between cases.

Env vars already wired in `supabase.ts`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

### 2. Migration — `src/services/migrations/017_add_sync_metadata.ts` (new)

Use the `new-migration` skill to scaffold, then fill in. For **each** table in `SYNCED_TABLES`:

```sql
ALTER TABLE <t> ADD COLUMN uuid TEXT;
ALTER TABLE <t> ADD COLUMN updated_at TEXT;
ALTER TABLE <t> ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';

-- backfill existing rows
UPDATE <t> SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL;
UPDATE <t> SET updated_at = COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  WHERE updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_<t>_uuid ON <t>(uuid);
CREATE INDEX IF NOT EXISTS idx_<t>_sync_status ON <t>(sync_status);

-- stamp + mark pending on insert
CREATE TRIGGER IF NOT EXISTS trg_<t>_ins AFTER INSERT ON <t>
BEGIN
  UPDATE <t> SET
    uuid = COALESCE(NEW.uuid, lower(hex(randomblob(16)))),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    sync_status = 'pending'
  WHERE rowid = NEW.rowid;
END;

-- stamp + mark pending ONLY when data columns change (not sync columns)
CREATE TRIGGER IF NOT EXISTS trg_<t>_upd AFTER UPDATE OF <data-cols> ON <t>
BEGIN
  UPDATE <t> SET
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    sync_status = 'pending'
  WHERE rowid = NEW.rowid;
END;
```

`<data-cols>` = every column on the table **except** `uuid`, `updated_at`, `sync_status` (so the
trigger never fires on a sync-only write). The exact column list per table is taken from migrations
001–016.

Register in `src/services/migrations/index.ts` as id 17 (`addSyncMetadata`).

Also create the **sync-cursor store**: a single-row key/value table for `lastPulledAt`.
```sql
CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT);
```
`sync_meta` is itself excluded from `SYNCED_TABLES`.

**Migration test — `src/services/migrations/__tests__/017_add_sync_metadata.test.ts`** (in-memory
better-sqlite3, the existing pattern):
1. After up(), every synced table has `uuid`, `updated_at`, `sync_status` columns.
2. Inserting a row stamps `updated_at` and leaves `sync_status = 'pending'`, and assigns a non-null `uuid`.
3. Updating a data column re-stamps `updated_at` and resets `sync_status` to `'pending'`.
4. Updating **only** `sync_status` (to `'synced'`) does NOT re-arm the trigger — `sync_status` stays
   `'synced'` and `updated_at` is unchanged. (Guards against the push/pull loop.)
5. Backfill assigns a unique `uuid` to every pre-existing row.

---

### 3. Supabase client + auth helpers — `src/services/supabase.ts` (modified)

Replace the `persistSession: false` stub with a SecureStore-backed session so sign-in survives
restarts, and add typed auth helpers.

```ts
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Creates a new cloud account. Throws on Supabase error. */
export async function signUp(email: string, password: string): Promise<void>;
/** Signs into an existing cloud account. Throws on invalid credentials. */
export async function signIn(email: string, password: string): Promise<void>;
/** Signs out and clears the persisted session. */
export async function signOut(): Promise<void>;
/** Returns the signed-in user's id, or null when signed out. */
export async function getCurrentUserId(): Promise<string | null>;
```

Each helper wraps the matching `supabase.auth.*` call and surfaces `error.message` as a thrown `Error`.

**Test — `src/services/__tests__/supabase.test.ts`** (against the fake client):
1. `signUp` calls `auth.signUp` and resolves on success.
2. `signIn` throws the Supabase error message on invalid credentials.
3. `signOut` calls `auth.signOut`.
4. `getCurrentUserId` returns null when there is no session, the id when there is.

---

### 4. Sync engine — `src/services/sync.ts` (new)

```ts
/** Tables that participate in cloud sync, in FK-safe order (parents first). */
export const SYNCED_TABLES = [
  'categories', 'expenses', 'income', 'allocations',
  'funds', 'fund_transactions', 'projects', 'project_transactions',
  'debts', 'quick_add_templates', 'recurring_expenses', 'zero_days',
] as const;

/** Pushes all locally-pending rows to Supabase, then marks them synced. */
export async function pushChanges(): Promise<{ pushed: number }>;

/** Pulls rows changed since lastPulledAt and upserts the newer ones locally. */
export async function pullChanges(): Promise<{ pulled: number }>;

/** push → pull. Returns a summary; never throws on offline — returns ok:false. */
export async function syncNow(): Promise<SyncResult>;

/** Reads/writes the lastPulledAt cursor from sync_meta. */
export async function getLastSyncedAt(): Promise<string | null>;
```

`SyncResult` (declared in a co-located `sync.types.ts` or inline): `{ ok: boolean; pushed: number;
pulled: number; lastSyncedAt: string | null; error?: string }`.

**Behaviour:**
- **Guarded by auth:** if `getCurrentUserId()` is null, `syncNow()` returns `{ ok: false, error:
  'Not signed in' }` and writes nothing.
- **push:** for each table (parents first), `SELECT * WHERE sync_status = 'pending'`; resolve FK
  columns to uuids; `supabase.from(table).upsert(rows, { onConflict: 'uuid' })`; on success
  `UPDATE <t> SET sync_status = 'synced' WHERE uuid IN (...)` (this write does not re-arm the trigger,
  per Decision 3).
- **pull:** for each table (parents first), `supabase.from(table).select().gt('updated_at',
  lastPulledAt)`; for each incoming row, look up the local row by `uuid`; insert if absent, or update
  **only if** `incoming.updated_at > local.updated_at` (local wins ties). FK uuids are mapped back to
  local ids. The local upsert sets `sync_status = 'synced'` directly.
- **offline resilience:** any thrown network error is caught and returned as `{ ok: false, error }`;
  pending rows stay pending for the next attempt.
- **cursor:** after a successful pull, store the max `updated_at` seen into `sync_meta`.

**FK uuid mapping helper (private):** builds `Map<localId, uuid>` and `Map<uuid, localId>` per parent
table on demand. Kept in `sync.ts`; if `sync.ts` approaches the 300-line cap, split the mapping into
`sync.mapping.ts` (mirrors how `budget.redistribution.ts` was split out in VS-09).

**Test — `src/services/__tests__/sync.test.ts`** (in-memory SQLite + fake client):
1. `pushChanges` sends every `sync_status = 'pending'` row to the fake client and marks them `'synced'`.
2. After `pushChanges`, no rows remain `'pending'`.
3. `pushChanges` sends **only** pending rows (already-synced rows are not re-sent).
4. `pullChanges` inserts a cloud-only row into local SQLite.
5. `pullChanges` overwrites a local row when the incoming `updated_at` is newer.
6. `pullChanges` keeps the local row when the incoming `updated_at` is older/equal (local wins).
7. `pullChanges` only requests rows with `updated_at > lastPulledAt` (cursor respected).
8. FK round-trip: a pulled `expense` resolves its `category_id` from the incoming `uuid` to the local
   category id.
9. `syncNow` returns `{ ok: false, error: 'Not signed in' }` when no session.
10. `syncNow` returns `{ ok: false }` (not a throw) when the fake client raises a network error;
    pending rows stay pending.
11. Recovery: starting from an empty local DB with a populated fake cloud, `pullChanges` restores
    rows across all `SYNCED_TABLES`.

---

### 5. Shared hook — `src/hooks/useCloudSync.ts` (new)

Lives in shared infra so the auth feature can consume it without a cross-feature edge.

```ts
/**
 * Cloud-backup state for the Settings UI. Wraps services/supabase + services/sync.
 */
export function useCloudSync(): {
  userEmail: string | null;          // null when signed out
  signedIn: boolean;
  status: 'idle' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;       // refreshes status + lastSyncedAt
};
```

On mount: reads the current session (`getCurrentUserId`) and `getLastSyncedAt()`. `syncNow` sets
`status = 'syncing'`, calls `services/sync.syncNow()`, then updates `status`/`lastSyncedAt`/`error`.

**Test — `src/hooks/__tests__/useCloudSync.test.ts`** (mock `services/sync` + `services/supabase`):
1. `signedIn` is false before sign-in, true after a successful `signIn`.
2. `syncNow` sets `status` to `'syncing'` then back to `'idle'` and updates `lastSyncedAt`.
3. `syncNow` surfaces `status = 'error'` + `error` message when the engine returns `ok: false`.
4. `signOut` clears `userEmail` and sets `signedIn` to false.

---

### 6. Background sync trigger — `src/services/SyncProvider.tsx` (new) OR root composition

A thin root-mounted component (consistent with `RecurringAutoLogger` / `DebtReminderScheduler` from
VS-07/VS-11) that:
- Runs `pullChanges()` once on mount (app open), guarded on a signed-in session.
- Subscribes to a lightweight app-write signal and pushes with a debounce (≥ 5 s) — or, simplest
  acceptable form for this slice, re-pushes on app foreground. (Decision 8: no long-running timer.)

Mounted in `src/app/_layout.tsx` alongside the other root schedulers.

**Test — `src/services/__tests__/SyncProvider.test.tsx`**:
1. Calls `pullChanges` on mount when signed in.
2. Does **not** call `pullChanges` when signed out.

> Note: if a provider component in `services/` is judged to belong in `app/` composition instead,
> fold the on-open pull into `_layout.tsx` directly and drop this file. Either keeps `services/` free
> of feature imports.

---

### 7. Settings UI — `src/features/finance/auth/SettingsScreen.tsx` (modified)

Add a **"Cloud Backup"** section driven by `useCloudSync()`:
- **Signed out:** email + password `TextInput`s, "Sign In" and "Create Account" buttons.
- **Signed in:** the account email, a "Sync Now" `Button`, a synced/pending status line, the last-
  synced timestamp (formatted via `@/utils/formatDate`), and a "Sign Out" button.
- A `syncing` spinner/disabled state while a sync is in flight; the `error` message in a muted/danger
  Typography when present.

Imports only shared infra (`@/hooks/useCloudSync`, `@/components/*`, `@/utils/*`) — no
`services/sync` or `services/supabase` import from the feature layer, and no new cross-feature edge.

**Test — `src/features/finance/auth/__tests__/SettingsScreen.test.tsx`** (extend existing; mock
`@/hooks/useCloudSync`):
1. Renders the email/password inputs and "Sign In" when signed out.
2. Renders the account email, "Sync Now", and "Sign Out" when signed in.
3. "Sync Now" calls the hook's `syncNow`.
4. Shows the last-synced timestamp when present.
5. Shows the error message when the hook reports `status = 'error'`.

---

### 8. Supabase schema (documentation, not app code)

The cloud-side schema mirrors `SYNCED_TABLES`, each keyed by `uuid` (text PK) with an `updated_at`
column and a Row-Level-Security policy scoping rows to `auth.uid()`. Captured in
`docs/supabase-schema.sql` (new doc file) for manual application in the Supabase dashboard. Not run by
the app and not covered by Jest — flagged in Out of Scope for automated coverage.

---

## TDD Anchors (full list)

### `017_add_sync_metadata.test.ts`
1. Every synced table gains `uuid` / `updated_at` / `sync_status`.
2. Insert stamps `updated_at` + `sync_status = 'pending'` + non-null `uuid`.
3. Data-column update re-stamps and re-marks `'pending'`.
4. Sync-only update (`sync_status → 'synced'`) does not re-arm the trigger.
5. Backfill assigns a unique uuid to every existing row.

### `supabase.test.ts`
1. `signUp` resolves on success. 2. `signIn` throws the error message on failure.
3. `signOut` calls `auth.signOut`. 4. `getCurrentUserId` null when signed out, id when signed in.

### `sync.test.ts`
1. push sends all pending rows and marks synced. 2. no pending rows remain after push.
3. push sends only pending rows. 4. pull inserts a cloud-only row. 5. pull overwrites on newer
`updated_at`. 6. pull keeps local on older/equal (local wins). 7. pull respects the `lastPulledAt`
cursor. 8. FK uuid round-trips to the local id. 9. `syncNow` reports not-signed-in. 10. `syncNow`
returns `ok:false` (no throw) on network error; pending stays pending. 11. full recovery from empty
local DB.

### `useCloudSync.test.ts`
1. signedIn flips on sign-in. 2. syncNow drives status + lastSyncedAt. 3. error surfaced on `ok:false`.
4. signOut clears state.

### `SyncProvider.test.tsx`
1. pulls on mount when signed in. 2. does not pull when signed out.

### `SettingsScreen.test.tsx` (additions)
1. signed-out controls. 2. signed-in controls. 3. Sync Now calls hook. 4. last-synced shown.
5. error shown.

---

## Acceptance Check (Done When)

- Settings has a Cloud Backup section: create account / sign in when signed out; email, Sync Now,
  status, last-synced timestamp, and sign out when signed in.
- Logging an expense/income while signed in marks the row `pending`; a sync pushes it and flips it to
  `synced`.
- "Sync Now" runs push+pull and updates the last-synced timestamp.
- Logging while offline succeeds locally; the pending change pushes on the next sync (no crash, no
  data loss).
- A fresh install signed into the same account pulls all `SYNCED_TABLES` data back into local SQLite.
- Editing the same record on two devices resolves to the most recent edit (last-write-wins, local
  breaks ties).
- `npm test` — all new and existing tests pass; full suite stays green. Supabase is mocked throughout.
- `/check-arch` clean — no feature imports `services/sync` or `services/supabase` directly; the auth
  Settings UI consumes `@/hooks/useCloudSync`; `services/` imports only `utils`/`constants`/`types`.

---

## Design Decisions

1. **Email/password identity decoupled from PIN.** Removes the VS-02 dependency and gives a real
   cross-device recovery story. The PIN remains a local lock; the cloud account is the backup
   identity.
2. **Triggers, not service edits, mark rows dirty.** One migration owns the sync-marking contract for
   all current and future write paths; feature services stay ignorant of sync. The `AFTER UPDATE OF
   <data-cols>` form is what makes the synced-flag write safe from recursion.
3. **UUID sync key alongside the integer PK.** Two devices can't agree on autoincrement ids; uuids
   are the portable identity. Local ids remain the in-app FK currency for zero churn in existing code.
4. **Last-write-wins, local breaks ties.** Matches `services/CLAUDE.md`. Simple, deterministic, and
   correct for a single-user/multi-device scenario where true conflicts are rare.
5. **Shared `useCloudSync` hook.** Keeps the sync wiring in shared infra so the Settings screen needs
   no forbidden `feature → services/sync` reach-through and no cross-feature edge.
6. **Supabase mocked in tests.** Sync logic is fully exercised against in-memory SQLite + a fake
   client; no flaky network, no credentials in CI.

---

## Out of Scope (Not in VS-15)

- PIN-linked cloud auth (deferred to / coordinated with VS-02).
- Real-time / continuous sync subscriptions (Supabase Realtime) — sync is on-open + debounced-push +
  manual only.
- Field-level / three-way merge conflict resolution — last-write-wins only.
- Selective restore, per-table sync toggles, or backup versioning/history.
- Syncing `users`, `_migrations`, or `sync_meta`. `users` is device/settings state (PIN hash, app
  mode, reminder prefs, first-run timestamp), not financial data — excluded by Decision 5 so the PIN
  hash never leaves the device and the new device's `created_at` is preserved. Cross-device settings
  restore, if ever wanted, is a deliberate future slice.
- Migrating the Supabase server schema from the app — `docs/supabase-schema.sql` is applied manually;
  not Jest-covered.
