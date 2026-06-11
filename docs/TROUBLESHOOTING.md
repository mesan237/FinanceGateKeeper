# Troubleshooting

A log of non-obvious runtime issues, their root cause, and the fix. Add an entry
whenever you spend more than a few minutes diagnosing something that wasn't
obvious from the code.

---

## `NativeDatabase.prepareAsync` has been rejected — `java.lang.NullPointerException` (Android)

### Symptom

On Android, every screen that reads the database throws on launch:

```
Call to function 'NativeDatabase.prepareAsync' has been rejected.
→ Caused by: java.lang.NullPointerException: java.lang.NullPointerException
```

The error surfaces immediately on the Dashboard, Transactions, and Projects
tabs (and as an uncaught-in-promise red box), before the user does anything.

### Root cause

A connection-open race in [`src/services/database.ts`](../src/services/database.ts).

At launch, many components mount and call `getDb()` in the same tick — all five
tab screens plus the root providers (`AppModeProvider`, `RecurringAutoLogger`,
`DebtReminderScheduler`, `DailyReminderScheduler`, `ZeroDayGate`). The old
`openConnection()` checked `if (!connection)` and then `await`ed
`openDatabaseAsync`. Because every caller reached that check before the first
`await` resolved, they **all** saw `connection === null`, so each one opened its
own native connection and ran the migration pass in parallel against the same
file. expo-sqlite (SDK 54 / v16) crashes under that concurrent open + parallel
`prepareAsync` with the `NullPointerException` above.

### Fix

Memoize the open-and-migrate work as a single in-flight promise so all
concurrent callers share one connection and one migration pass:

```ts
let initPromise: Promise<SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (!initPromise) {
    initPromise = openAndMigrate().catch((error) => {
      initPromise = null; // let a later call (e.g. Retry) try again
      throw error;
    });
  }
  return initPromise;
}
```

On failure the promise is cleared so the Dashboard's **Retry** button can
re-attempt from scratch. `closeDb()` resets `initPromise` alongside the
connection.

### How to recognize it again

Any "first query works, later ones reject with NPE" or "every screen rejects at
launch" report from expo-sqlite on Android is almost always concurrent access.
Never open a connection or run migrations from more than one place — funnel
everything through the memoized `getDb()`.

---

## Content drawing under the status bar (Android edge-to-edge)

### Symptom

Screen headers and content sit underneath the system status bar (clock,
battery, signal icons overlap the title).

### Root cause

Expo SDK 54 / RN 0.81 enables Android **edge-to-edge by default**, so the app
draws behind the status bar. `SafeAreaView` imported from `react-native` is a
**no-op on Android** and does not apply the top inset.

### Fix

Apply the top inset once at the root in
[`src/app/_layout.tsx`](../src/app/_layout.tsx) using `SafeAreaProvider` +
`SafeAreaView` from `react-native-safe-area-context` (wrapping the `<Stack />`),
rather than per screen. Screens use a plain `View` for their root container —
they must **not** import `SafeAreaView` from `react-native` (it both fails on
Android and would double-inset on iOS).

---

## Supabase schema: `ERROR: 42703: column "user_id" does not exist` (creating RLS policy)

### Symptom

Running [`supabase/schema.sql`](../supabase/schema.sql) in the Supabase SQL editor
fails inside the policy block:

```
ERROR:  42703: column "user_id" does not exist
CONTEXT: SQL statement "create policy categories_owner on categories
         for all using (user_id = auth.uid()) ..."
```

### Root cause

The cloud `categories` table already existed **without** a `user_id` column — left
over from the earlier integer-id schema. The current schema starts with
`DROP TABLE … CASCADE` and recreates every table *with* `user_id`, so this error
can only happen if that DROP+CREATE did **not** run. Two ways that happens:

- the SQL editor still had the **old** script pasted and you re-ran that buffer, or
- you had text **selected**, so the editor executed only the highlighted region
  (e.g. just the RLS block), skipping the DROP+CREATE above it.

### Fix

Run the **entire** current [`supabase/schema.sql`](../supabase/schema.sql) in a
fresh query with nothing selected: open a new query tab, paste the whole file,
Select-All is not needed (an empty selection runs everything), and execute. The
`DROP TABLE … CASCADE` at the top clears the stale tables; the recreated ones have
`uuid` + `user_id`.

Confirm which schema is live with:

```sql
select column_name from information_schema.columns
where table_name = 'categories' order by ordinal_position;
```

An `id` column with no `uuid`/`user_id` means the old integer-id table is still
there. The RLS loop also now runs `add column if not exists user_id …`
defensively, but that alone is not enough — the sync engine needs the `uuid`
columns and uuid foreign keys, so the full DROP+CREATE must run. See
[CLOUD-SYNC.md](./CLOUD-SYNC.md) for the data model.
