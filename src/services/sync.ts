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

/** Raises/lowers the trigger-suppression flag around the engine's own writes. */
async function setGuard(active: boolean): Promise<void> {
  await execute('UPDATE _sync_guard SET active = ? WHERE id = 1', [active ? 1 : 0]);
}

/**
 * Pushes every locally-pending row to the cloud (parents first), then marks the
 * pushed rows synced. FK ids are translated to uuids on the way out. A cloud
 * error aborts the push and propagates — already-marked tables stay synced, the
 * rest stay pending for the next attempt.
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

    const uuids = rows.map((r) => r.uuid as string);
    const placeholders = uuids.map(() => '?').join(', ');
    await execute(
      `UPDATE ${table} SET sync_status = 'synced' WHERE uuid IN (${placeholders})`,
      uuids as SqlBindValue[],
    );
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

  await setGuard(true);
  try {
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
  } finally {
    await setGuard(false);
  }

  // The cursor advances to the newest timestamp seen and the next pull uses a
  // strict `>` filter. A future cloud row written with an `updated_at` exactly
  // equal to this max could be missed — an accepted tradeoff of a single
  // timestamp cursor under last-write-wins (no three-way merge; see VS-15 scope).
  if (maxSeen > cursor) await setLastSyncedAt(maxSeen);
  return { pulled };
}

/**
 * Runs a full sync: push local changes, then pull cloud changes. Returns
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
 * Clears every synced table and writes the cloud rows in, in one transaction
 * with the sync guard raised, then points the pull cursor at the newest cloud
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
      await setGuard(true);
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
      await setGuard(false);
      await execute('COMMIT');
    } catch (e) {
      // Rolling back also restores the guard flag to its lowered state.
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
