import { execute, query, type SqlBindValue } from '@/services/database';
import { SYNCED_TABLES, type SyncedTable } from '@/services/migrations/017_add_sync_metadata';
import { applyCloudRow, sortForInsert, toCloudRow, type Row } from '@/services/sync.mapping';
import { createSnapshot } from '@/services/snapshots.service';
import type { CloudRestoreError, CloudRestoreResult, SyncResult } from '@/services/sync.types';
import { getCurrentUserId, supabase } from '@/services/supabase';

export { SYNCED_TABLES };
export type { CloudRestoreResult, SyncResult };

const EPOCH = '1970-01-01T00:00:00.000Z';

/** Returns the timestamp of the last successful pull, or null if never synced. */
export async function getLastSyncedAt(): Promise<string | null> {
  const rows = await query<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'lastPulledAt' LIMIT 1`,
  );
  return rows[0]?.value ?? null;
}

async function setLastSyncedAt(ts: string): Promise<void> {
  await execute(
    `INSERT INTO sync_meta (key, value) VALUES ('lastPulledAt', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [ts],
  );
}

/** Rows per statement when marking pushed rows synced (2 bind values each). */
const MARK_CHUNK = 400;

/**
 * Marks pushed rows synced, but only where `updated_at` still matches what was
 * sent. A row the user edited during the upload has a newer stamp, so it stays
 * pending and goes out on the next push.
 */
async function markSynced(table: SyncedTable, rows: Row[]): Promise<void> {
  for (let i = 0; i < rows.length; i += MARK_CHUNK) {
    const chunk = rows.slice(i, i + MARK_CHUNK);
    const pairs = chunk.map(() => '(?, ?)').join(', ');
    await execute(
      `UPDATE ${table} SET sync_status = 'synced' WHERE (uuid, updated_at) IN (VALUES ${pairs})`,
      chunk.flatMap((r) => [r.uuid, r.updated_at]) as SqlBindValue[],
    );
  }
}

/**
 * Pushes every locally-pending row to the cloud (parents first), then marks the
 * pushed rows synced unless they changed meanwhile. FK ids are translated to
 * uuids on the way out. A cloud error aborts the push and propagates —
 * already-marked tables stay synced, the rest stay pending for the next attempt.
 */
export async function pushChanges(): Promise<{ pushed: number }> {
  let pushed = 0;
  for (const table of SYNCED_TABLES) {
    const rows = await query<Row>(`SELECT * FROM ${table} WHERE sync_status = 'pending'`);
    if (rows.length === 0) continue;

    const cloudRows: Row[] = [];
    for (const row of rows) cloudRows.push(await toCloudRow(table, row));

    const { error } = await supabase.from(table).upsert(cloudRows, { onConflict: 'uuid' });
    if (error) throw new Error(error.message);

    await markSynced(table, rows);
    pushed += rows.length;
  }
  return { pushed };
}

/**
 * Pulls rows changed since the last sync (parents first) and applies the newer
 * ones locally (last-write-wins). A single unmergeable row is skipped rather than
 * aborting the pull; a cloud/network error propagates. Advances the cursor to the
 * newest timestamp seen.
 */
export async function pullChanges(): Promise<{ pulled: number }> {
  const cursor = (await getLastSyncedAt()) ?? EPOCH;
  let pulled = 0;
  let maxSeen = cursor;

  for (const table of SYNCED_TABLES) {
    const { data, error } = await supabase.from(table).select().gt('updated_at', cursor);
    if (error) throw new Error(error.message);

    const rows = sortForInsert(table, (data ?? []) as Row[]);
    for (const cloud of rows) {
      const updatedAt = cloud.updated_at as string | undefined;
      if (typeof updatedAt === 'string' && updatedAt > maxSeen) maxSeen = updatedAt;
      try {
        if (await applyCloudRow(table, cloud)) pulled += 1;
      } catch {
        // Skip one unmergeable row (e.g. a natural-key clash from data created
        // independently on two devices) instead of aborting the whole pull.
      }
    }
  }

  // The cursor advances to the newest timestamp seen and the next pull uses a
  // strict `>` filter. A future cloud row written with an `updated_at` exactly
  // equal to this max could be missed — an accepted tradeoff of a single
  // timestamp cursor under last-write-wins (no three-way merge; see VS-15 scope).
  if (maxSeen > cursor) await setLastSyncedAt(maxSeen);
  return { pulled };
}

/**
 * True when no synced table holds a record the user made: only the default
 * categories and accounts a fresh install (or a reset) seeds. Seeded accounts
 * get random uuids, so a phone in this state must never push before pulling.
 */
async function holdsOnlyInstallDefaults(): Promise<boolean> {
  for (const table of SYNCED_TABLES) {
    if (table === 'accounts') continue;
    const where = table === 'categories' ? ' WHERE is_default = 0' : '';
    const rows = await query<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}${where}`);
    if ((rows[0]?.c ?? 0) > 0) return false;
  }
  return true;
}

/**
 * On a phone's first sync (no pull cursor) with nothing but install defaults,
 * replaces local data with a non-empty cloud backup instead of pushing those
 * defaults over it. Returns the rows restored, or null when a normal sync
 * should run instead. Throws on a cloud error.
 */
async function restoreIfFreshInstall(): Promise<number | null> {
  if ((await getLastSyncedAt()) !== null) return null;
  if (!(await holdsOnlyInstallDefaults())) return null;

  const tables = await fetchAllFromCloud();
  if (tables.every(([, rows]) => rows.length === 0)) return null;

  await createSnapshot('before-restore');
  return replaceWithCloudRows(tables);
}

/**
 * Runs a full sync: push local changes, then pull cloud changes. On a freshly
 * installed or reset phone with a cloud backup, restores that backup instead
 * (see `restoreIfFreshInstall`). Returns
 * `{ ok: false }` (never throws) when signed out or when the cloud is
 * unreachable, so callers can surface the state without try/catch.
 */
export async function syncNow(): Promise<SyncResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      ok: false,
      pushed: 0,
      pulled: 0,
      lastSyncedAt: await getLastSyncedAt(),
      error: 'Not signed in',
    };
  }

  try {
    const restored = await restoreIfFreshInstall();
    if (restored !== null) {
      return {
        ok: true,
        pushed: 0,
        pulled: restored,
        lastSyncedAt: await getLastSyncedAt(),
        restoredFromCloud: true,
      };
    }
    const { pushed } = await pushChanges();
    const { pulled } = await pullChanges();
    return { ok: true, pushed, pulled, lastSyncedAt: await getLastSyncedAt() };
  } catch (e) {
    return {
      ok: false,
      pushed: 0,
      pulled: 0,
      lastSyncedAt: await getLastSyncedAt(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Fetches every synced table from the cloud, parents first. Throws on a cloud error. */
async function fetchAllFromCloud(): Promise<Array<[SyncedTable, Row[]]>> {
  const tables: Array<[SyncedTable, Row[]]> = [];
  for (const table of SYNCED_TABLES) {
    const { data, error } = await supabase.from(table).select();
    if (error) throw new Error(error.message);
    tables.push([table, sortForInsert(table, (data ?? []) as Row[])]);
  }
  return tables;
}

/**
 * Clears every synced table and writes the cloud rows in, in one transaction,
 * then points the pull cursor at the newest cloud
 * timestamp. A single unmergeable row is skipped, as in `pullChanges`. Any other
 * failure rolls the whole replace back. Returns the number of rows written.
 */
async function replaceWithCloudRows(tables: Array<[SyncedTable, Row[]]>): Promise<number> {
  let restored = 0;
  let maxSeen = EPOCH;
  // `PRAGMA foreign_keys` can only change outside a transaction (see importData).
  await execute('PRAGMA foreign_keys = OFF');
  try {
    await execute('BEGIN TRANSACTION');
    try {
      for (const table of [...SYNCED_TABLES].reverse()) {
        await execute(`DELETE FROM ${table}`);
      }
      for (const [table, rows] of tables) {
        for (const cloud of rows) {
          const updatedAt = cloud.updated_at;
          if (typeof updatedAt === 'string' && updatedAt > maxSeen) maxSeen = updatedAt;
          try {
            if (await applyCloudRow(table, cloud)) restored += 1;
          } catch {
            // Skip one unmergeable row rather than abort the restore.
          }
        }
      }
      await setLastSyncedAt(maxSeen);
      await execute('COMMIT');
    } catch (e) {
      await execute('ROLLBACK');
      throw e;
    }
  } finally {
    await execute('PRAGMA foreign_keys = ON');
  }
  return restored;
}

/**
 * Replaces this phone's synced data with the cloud copy. Everything is fetched
 * first, so a cloud error, a signed-out session or an empty cloud backup leaves
 * the phone untouched. Then a "before restore" snapshot of the local data is
 * taken (local changes never pushed are otherwise lost), the local tables are
 * cleared and refilled from the cloud, and the pull cursor moves to the newest
 * cloud row. Never throws: failures come back as `{ ok: false, error }`.
 */
export async function restoreFromCloud(): Promise<CloudRestoreResult> {
  const fail = async (error: CloudRestoreError, e?: unknown): Promise<CloudRestoreResult> => ({
    ok: false,
    restored: 0,
    lastSyncedAt: await getLastSyncedAt(),
    error,
    ...(e === undefined ? {} : { message: errorText(e) }),
  });

  if (!(await getCurrentUserId())) return fail('not-signed-in');

  let tables: Array<[SyncedTable, Row[]]>;
  try {
    tables = await fetchAllFromCloud();
  } catch (e) {
    return fail('cloud-error', e);
  }
  if (tables.every(([, rows]) => rows.length === 0)) return fail('cloud-empty');

  try {
    await createSnapshot('before-restore');
    const restored = await replaceWithCloudRows(tables);
    return { ok: true, restored, lastSyncedAt: await getLastSyncedAt() };
  } catch (e) {
    return fail('restore-failed', e);
  }
}
