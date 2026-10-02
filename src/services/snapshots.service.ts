import { Directory, File, Paths } from 'expo-file-system';

import { exportData, importData } from '@/services/dataTransfer.service';
import type { SnapshotFile, SnapshotInfo, SnapshotReason } from '@/services/snapshots.types';
import { toISODate } from '@/utils/formatDate';

export type { SnapshotInfo, SnapshotReason };

/** How many automatic daily snapshots are kept. */
export const DAILY_SNAPSHOTS_KEPT = 7;
/** How many manual and "before restore" snapshots are kept, counted together. */
export const SAFETY_SNAPSHOTS_KEPT = 5;

// `snapshot-2026-10-02T09-00-00-000Z-daily.json`: the ISO time with `:`/`.`
// swapped for `-` (safe in a file name), then the reason. Anything else in the
// folder is ignored, and only names matching this can be read or deleted.
const NAME_PATTERN =
  /^snapshot-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z-(daily|manual|before-restore)\.json$/;

interface ParsedName {
  id: string;
  createdAt: string;
  reason: SnapshotReason;
}

function snapshotsDir(): Directory {
  return new Directory(Paths.document, 'backups');
}

function parseName(name: string): ParsedName | null {
  const m = NAME_PATTERN.exec(name);
  if (!m) return null;
  const [, date, hh, mm, ss, ms, reason] = m;
  return { id: name, createdAt: `${date}T${hh}:${mm}:${ss}.${ms}Z`, reason: reason as SnapshotReason };
}

/** Every snapshot file name in the folder, parsed, newest first. Reads no contents. */
function listNames(): ParsedName[] {
  const dir = snapshotsDir();
  if (!dir.exists) return [];
  const parsed: ParsedName[] = [];
  for (const entry of dir.list()) {
    if (!(entry instanceof File)) continue;
    const name = parseName(entry.name);
    if (name) parsed.push(name);
  }
  return parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

/** The file for a snapshot id, refusing anything that isn't a snapshot name. */
function snapshotFile(id: string): File {
  if (!parseName(id)) throw new Error(`Not a snapshot: ${id}`);
  return new File(snapshotsDir(), id);
}

function toInfo(name: ParsedName, file: File, content: SnapshotFile): SnapshotInfo {
  return { ...name, rowCount: content.snapshot.rowCount, sizeBytes: file.size };
}

function readSnapshotFile(file: File): SnapshotFile | null {
  try {
    const content = JSON.parse(file.textSync()) as SnapshotFile;
    return typeof content.snapshot?.rowCount === 'number' ? content : null;
  } catch {
    return null;
  }
}

/**
 * Deletes the oldest snapshots beyond the daily and safety-copy caps. `spareId`
 * is never counted or deleted: it's the snapshot being restored, which the new
 * "before restore" copy would otherwise push out of the list.
 */
function prune(spareId?: string): void {
  const names = listNames().filter((n) => n.id !== spareId);
  const daily = names.filter((n) => n.reason === 'daily');
  const safety = names.filter((n) => n.reason !== 'daily');
  for (const stale of [
    ...daily.slice(DAILY_SNAPSHOTS_KEPT),
    ...safety.slice(SAFETY_SNAPSHOTS_KEPT),
  ]) {
    snapshotFile(stale.id).delete();
  }
}

/**
 * Writes every synced table to a new snapshot file in the app's private
 * `documents/backups` folder, then prunes the oldest ones: the 7 newest daily
 * snapshots are kept, and manual plus "before restore" snapshots are capped
 * separately at 5, so the daily rotation never deletes a safety copy. A
 * `spareId` snapshot is left out of that pruning (see `restoreSnapshot`).
 */
export async function createSnapshot(
  reason: SnapshotReason,
  now: Date = new Date(),
  spareId?: string,
): Promise<SnapshotInfo> {
  const payload = await exportData();
  const createdAt = now.toISOString();
  const rowCount = Object.values(payload.tables).reduce((sum, rows) => sum + (rows?.length ?? 0), 0);
  const content: SnapshotFile = { ...payload, exportedAt: createdAt, snapshot: { reason, rowCount } };

  snapshotsDir().create({ intermediates: true, idempotent: true });
  const id = `snapshot-${createdAt.replace(/[:.]/g, '-')}-${reason}.json`;
  const file = snapshotFile(id);
  file.create({ overwrite: true });
  file.write(JSON.stringify(content));

  prune(spareId);
  return { id, createdAt, reason, rowCount, sizeBytes: file.size };
}

/**
 * Lists the local snapshots newest first, with each one's row count (read from
 * the file's header) and size. Files that aren't snapshots, or can't be read,
 * are left out.
 */
export async function listSnapshots(): Promise<SnapshotInfo[]> {
  const infos: SnapshotInfo[] = [];
  for (const name of listNames()) {
    const file = snapshotFile(name.id);
    const content = readSnapshotFile(file);
    if (content) infos.push(toInfo(name, file, content));
  }
  return infos;
}

/**
 * Takes the day's automatic snapshot unless one already exists for the same
 * UTC day (the app's date convention). Returns the new snapshot, or null when
 * today's was already taken. Manual and "before restore" snapshots don't count.
 */
export async function ensureDailySnapshot(now: Date = new Date()): Promise<SnapshotInfo | null> {
  const today = toISODate(now);
  const taken = listNames().some((n) => n.reason === 'daily' && n.createdAt.startsWith(today));
  if (taken) return null;
  return createSnapshot('daily', now);
}

/** Deletes one snapshot. Throws for an id that isn't a snapshot file name. */
export async function deleteSnapshot(id: string): Promise<void> {
  snapshotFile(id).delete();
}

/**
 * Replaces all local data with a snapshot, reversibly: the snapshot is read
 * first (an unreadable one throws before anything changes), then a "before
 * restore" snapshot of the current data is taken, then the data is replaced.
 * Every restored row is finally marked pending with a fresh `updated_at`, so the
 * next sync pushes it and the cloud converges on the restored data. Rows that
 * exist only in the cloud stay there; the sync engine sends no deletions.
 */
export async function restoreSnapshot(id: string, now: Date = new Date()): Promise<void> {
  const content = readSnapshotFile(snapshotFile(id));
  if (!content) throw new Error(`Unreadable snapshot: ${id}`);

  await createSnapshot('before-restore', now, id);
  await importData(content, { markPendingAt: now.toISOString() });
}
