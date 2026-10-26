import { execute, query } from '@/services/database';
import { applyCloudRow, type Row } from '@/services/sync.mapping';
import { supabase } from '@/services/supabase';

/**
 * On a phone's first sync that is not a fresh-install restore, lets each wallet
 * that was never uploaded take over the cloud wallet with the same name and type
 * (case-insensitive) that this phone does not have yet: it adopts that wallet's
 * uuid and fields, so the cloud's history and opening balance win and anything
 * already logged on it stays attached (same local id). Without this, the three
 * wallets a new install seeds — random uuids, unlike the default categories —
 * were pushed beside the user's own and every wallet appeared twice (found on
 * the first device build, 2026-10-26). Later syncs never merge by name.
 * Throws on a cloud error.
 */
export async function adoptCloudWallets(): Promise<void> {
  const { data, error } = await supabase.from('accounts').select();
  if (error) throw new Error(error.message);
  const cloudRows = (data ?? []) as Row[];
  const local = await query<{ id: number; uuid: string; name: string; type: string; sync_status: string }>(
    'SELECT id, uuid, name, type, sync_status FROM accounts',
  );
  const localUuids = new Set(local.map((a) => a.uuid));
  const taken = new Set<number>();
  const key = (name: unknown, type: unknown) => `${String(name).trim().toLowerCase()}|${String(type)}`;

  for (const cloud of cloudRows) {
    if (localUuids.has(cloud.uuid as string)) continue;
    const match = local.find(
      (a) => a.sync_status !== 'synced' && !taken.has(a.id) && key(a.name, a.type) === key(cloud.name, cloud.type),
    );
    if (!match) continue;
    taken.add(match.id);
    // Take the cloud identity, then let the cloud row overwrite the starter's fields.
    await execute("UPDATE accounts SET uuid = ?, updated_at = '' WHERE id = ?", [cloud.uuid as string, match.id]);
    await applyCloudRow('accounts', cloud);
  }
}
