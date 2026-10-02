import { useCallback, useEffect, useState } from 'react';

import {
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
  restoreSnapshot,
} from '@/services/snapshots.service';
import { restoreFromCloud } from '@/services/sync';

import type { CloudRestoreResult, SnapshotInfo } from './backup.types';

/**
 * The on-phone snapshot list plus its actions. `create`, `restore` and `remove`
 * resolve to true on success and false on failure (never throw), and the list
 * is re-read after each one, since a restore also adds a "before restore"
 * snapshot and a new snapshot can prune old ones.
 */
export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSnapshots(await listSnapshots());
    } catch {
      setSnapshots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      setIsBusy(true);
      try {
        await action();
        return true;
      } catch {
        return false;
      } finally {
        await refresh();
        setIsBusy(false);
      }
    },
    [refresh],
  );

  const create = useCallback(() => run(() => createSnapshot('manual')), [run]);
  const restore = useCallback((id: string) => run(() => restoreSnapshot(id)), [run]);
  const remove = useCallback((id: string) => run(() => deleteSnapshot(id)), [run]);

  return { snapshots, isLoading, isBusy, refresh, create, restore, remove };
}

/** Wraps `restoreFromCloud` with a busy flag. The outcome is returned, never thrown. */
export function useCloudRestore() {
  const [isRestoring, setIsRestoring] = useState(false);

  const restore = useCallback(async (): Promise<CloudRestoreResult> => {
    setIsRestoring(true);
    try {
      return await restoreFromCloud();
    } finally {
      setIsRestoring(false);
    }
  }, []);

  return { restore, isRestoring };
}
