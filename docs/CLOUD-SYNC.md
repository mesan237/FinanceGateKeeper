# Cloud Backup & Sync (VS-15)

Local-first backup of all financial data to Supabase, with cross-device restore.
Every write hits on-device SQLite first; sync to the cloud is background and
non-blocking. On a new device you sign in and pull your data back.

- **Source:** [`src/services/sync.ts`](../src/services/sync.ts),
  [`src/services/sync.mapping.ts`](../src/services/sync.mapping.ts),
  [`src/services/supabase.ts`](../src/services/supabase.ts)
- **Schema migration:** [`src/services/migrations/017_add_sync_metadata.ts`](../src/services/migrations/017_add_sync_metadata.ts)
- **Hooks:** [`src/hooks/useCloudSync.ts`](../src/hooks/useCloudSync.ts),
  [`src/hooks/useBackgroundSync.ts`](../src/hooks/useBackgroundSync.ts)
- **UI:** the "Cloud backup" section in
  [`src/features/finance/auth/SettingsScreen.tsx`](../src/features/finance/auth/SettingsScreen.tsx)
- **Server schema:** [`supabase/schema.sql`](../supabase/schema.sql)

---

## Setup

1. **Create a Supabase project** (free tier is fine). Enable email/password auth
   (Authentication → Providers → Email). For single-user convenience you may turn
   off "Confirm email" so sign-up is immediate.

2. **Apply the schema.** Open the Supabase SQL editor, paste the **entire**
   contents of [`supabase/schema.sql`](../supabase/schema.sql), and run it. It
   drops any stale tables and recreates the 12 financial tables uuid-keyed with
   per-user row-level security.

   > ⚠️ The script begins with `DROP TABLE … CASCADE`. That is safe on a fresh
   > project but **destroys existing rows** — do not run it over a project that
   > already holds real synced data.

3. **Set env vars.** Copy [`.env.example`](../.env.example) to `.env` and fill in
   your project URL and anon key (Project Settings → API):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

   The app throws at startup if these are missing
   ([`supabase.ts`](../src/services/supabase.ts)).

4. **Sign in.** In the app, open **Settings → Cloud backup**, enter an email and
   password, and tap **Create account** (first time) or **Sign in**. The session
   is persisted in the device keychain via `expo-secure-store`, so it survives
   restarts without storing the password.

---

## How it works

### Identity is decoupled from the PIN

The cloud account is an **email/password** Supabase identity, independent of the
local app PIN (VS-02). The PIN is a device-only lock; the email/password is the
backup/recovery identity. This is why VS-15 does not depend on VS-02 shipping.

Helpers in [`supabase.ts`](../src/services/supabase.ts): `signUp`, `signIn`,
`signOut`, `getCurrentUserId`, `getCurrentUser`.

### Data model: uuid is the cloud key, integer id stays local

Two devices both start their SQLite autoincrement `id` at 1, so the integer id
cannot be the cloud key. Migration 017 adds a `uuid TEXT` column (unique) to every
synced table. **Locally**, the integer `id` remains the in-app foreign-key
currency. **In the cloud**, rows are keyed by `uuid` and foreign keys are stored
as the referenced row's `uuid` (text), so relationships survive a restore onto a
device with different ids. The translation happens on every push/pull
([`sync.mapping.ts`](../src/services/sync.mapping.ts), `FOREIGN_KEYS`).

Default categories (seeded identically on every install) get **deterministic**
uuids (`seed-category-<id>`) so they don't duplicate across devices on first sync.

Each synced table also carries:

- `updated_at` (ISO-8601 text) — written by the **client**; the basis for
  last-write-wins. There is intentionally **no** server-side `updated_at` trigger
  (it would clobber the client value and break the pull comparison).
- `sync_status` (`'pending' | 'synced'`) — set to `pending` on every local write,
  flipped to `synced` after a successful push.

### Dirty-marking triggers (and the loop-suppression trick)

Rather than edit all 11 feature services to set `sync_status = 'pending'`,
migration 017 installs per-table triggers:

- `AFTER INSERT … WHEN NEW.uuid IS NULL` — a local insert arrives with no uuid, so
  the trigger stamps `uuid`/`updated_at` and marks it pending. Sync-side inserts
  supply their own uuid, so the trigger skips them.
- `AFTER UPDATE OF <data columns>` — fires only when a real data column changes,
  never when the engine writes the sync columns. So marking a row `synced` after a
  push does **not** re-arm the dirty flag (no push/pull loop).

Belt-and-braces, a one-row `_sync_guard` table is raised (`active = 1`) around the
engine's own pull writes; the trigger `WHEN` clause checks it, so pull overwrites
keep their cloud timestamp and synced status instead of bouncing back as pending.

### The sync engine

[`sync.ts`](../src/services/sync.ts) exposes `pushChanges`, `pullChanges`,
`syncNow`, `getLastSyncedAt`.

- **push** — for each table (parents first), select `sync_status = 'pending'`,
  translate FK ids → uuids, `upsert(onConflict: 'uuid')`, then mark the rows
  `synced`. A cloud error aborts and propagates; already-marked tables stay
  synced, the rest stay pending for the next attempt.
- **pull** — for each table (parents first), `select().gt('updated_at', cursor)`,
  translate FK uuids → local ids, and apply each row: insert when absent, or
  overwrite **only if** the incoming `updated_at` is strictly newer
  (**last-write-wins; local breaks ties**). The cursor (`sync_meta.lastPulledAt`)
  advances to the newest timestamp seen.
- **syncNow** — `push` then `pull`. Returns `{ ok: false }` (never throws) when
  signed out or when the cloud is unreachable, so callers surface state without
  try/catch. Pending rows survive a failed attempt.

### Triggers for a sync

- **On app open / foreground** — [`useBackgroundSync`](../src/hooks/useBackgroundSync.ts),
  mounted once in [`_layout.tsx`](../src/app/_layout.tsx), runs `syncNow` on mount
  and on every `AppState` → `active`, but only while signed in.
- **Manual** — the **Sync Now** button in Settings, via
  [`useCloudSync`](../src/hooks/useCloudSync.ts).
- **After a write** — covered indirectly: the next foreground/open or manual sync
  picks up everything marked `pending`. (There is no debounced per-write push; see
  Limitations.)

---

## What syncs

The 12 financial tables: `categories`, `expenses`, `income`, `allocations`,
`funds`, `fund_transactions`, `projects`, `project_transactions`,
`quick_add_templates`, `recurring_expenses`, `zero_days`, `debts`
(`SYNCED_TABLES` in
[`017_add_sync_metadata.ts`](../src/services/migrations/017_add_sync_metadata.ts)).

**Not synced:**

- `users` — device/settings state (PIN hash, app mode, reminder prefs, first-run
  timestamp). Excluded so the PIN hash never leaves the device and the new
  device's `created_at` (which anchors the learning→control nudge) is preserved.
- `_migrations`, `_sync_guard`, `sync_meta` — local bookkeeping. Schema is rebuilt
  by the migration runner on each device, not synced.

---

## Recovery flow (new device)

1. Install the app; the migration runner builds the local schema (empty data).
2. Open **Settings → Cloud backup** and sign in with the same credentials.
3. The next sync (`pullChanges`) restores every synced table from the cloud.

For the cleanest restore, pull **before** creating any local data on the new
device, so independently-created singleton rows (funds, allocations) don't clash
with the cloud copies (see Limitations).

---

## Testing

Supabase is **fully mocked** — the network is never hit.

- [`__mocks__/@supabase/supabase-js.js`](../__mocks__/@supabase/supabase-js.js) —
  an in-memory fake client (chainable `from().upsert()/.select()/.gt()`, plus
  `auth.*`) with `__reset`/`__seed`/`__getTable`/`__setSession`/`__fail` helpers.
- [`jest.setup.ts`](../jest.setup.ts) seeds dummy `EXPO_PUBLIC_SUPABASE_*` env vars
  so `supabase.ts`'s import-time guard doesn't throw.
- Engine tests ([`sync.test.ts`](../src/services/__tests__/sync.test.ts)) run
  against in-memory better-sqlite3 + the fake client: push/pull, last-write-wins
  tie-breaking, FK round-trip, not-signed-in, network-error resilience, and full
  recovery from an empty DB.

---

## Limitations (out of scope for VS-15)

- **Conflict resolution is last-write-wins only.** No field-level / three-way
  merge. Concurrent edits to the same record on two devices resolve to whichever
  has the newer `updated_at`.
- **Natural-key clashes across devices.** Rows created independently on two devices
  that share a UNIQUE constraint (e.g. `funds.type`, `allocations.month`,
  `zero_days.date`) have different uuids and would collide on pull. The engine
  **skips** such a row rather than crashing; the clean path is to pull onto a fresh
  device before creating local data. A true merge is future work.
- **No realtime sync.** Sync is on-open + on-foreground + manual; there is no
  Supabase Realtime subscription and no debounced per-write push.
- **Single-user assumption.** `uuid` is a global primary key and default-category
  uuids are deterministic — both assume one account per dataset.
- **Server schema is applied manually.** [`supabase/schema.sql`](../supabase/schema.sql)
  is run by hand in the dashboard; the app does not migrate the cloud, and the
  cloud schema is not covered by Jest.
