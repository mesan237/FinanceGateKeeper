import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/snapshots.service', () => ({
  listSnapshots: jest.fn(),
  createSnapshot: jest.fn(),
  restoreSnapshot: jest.fn(),
  deleteSnapshot: jest.fn(),
}));
jest.mock('@/services/sync', () => ({ restoreFromCloud: jest.fn() }));

import { useCloudRestore, useSnapshots } from '@/features/finance/backup/backup.hooks';
import * as snapshots from '@/services/snapshots.service';
import * as sync from '@/services/sync';

const mList = snapshots.listSnapshots as jest.Mock;
const mCreate = snapshots.createSnapshot as jest.Mock;
const mRestore = snapshots.restoreSnapshot as jest.Mock;
const mDelete = snapshots.deleteSnapshot as jest.Mock;
const mCloudRestore = sync.restoreFromCloud as jest.Mock;

const SNAP = {
  id: 'snapshot-2026-10-02T09-00-00-000Z-daily.json',
  createdAt: '2026-10-02T09:00:00.000Z',
  reason: 'daily' as const,
  rowCount: 40,
  sizeBytes: 2048,
};

beforeEach(() => {
  jest.clearAllMocks();
  mList.mockResolvedValue([SNAP]);
});

describe('useSnapshots', () => {
  it('loads the snapshot list on mount', async () => {
    const { result } = renderHook(() => useSnapshots());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.snapshots).toEqual([SNAP]);
  });

  it('takes a manual snapshot and refreshes the list', async () => {
    mCreate.mockResolvedValue(SNAP);
    const { result } = renderHook(() => useSnapshots());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = false;
    await act(async () => {
      ok = await result.current.create();
    });

    expect(ok).toBe(true);
    expect(mCreate).toHaveBeenCalledWith('manual');
    expect(mList).toHaveBeenCalledTimes(2);
  });

  it('restores a snapshot by id', async () => {
    mRestore.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSnapshots());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.restore(SNAP.id);
    });

    expect(mRestore).toHaveBeenCalledWith(SNAP.id);
  });

  it('reports false and still refreshes when a restore fails', async () => {
    mRestore.mockRejectedValue(new Error('unreadable'));
    const { result } = renderHook(() => useSnapshots());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let ok = true;
    await act(async () => {
      ok = await result.current.restore(SNAP.id);
    });

    expect(ok).toBe(false);
    expect(mList).toHaveBeenCalledTimes(2);
    expect(result.current.isBusy).toBe(false);
  });

  it('deletes a snapshot by id', async () => {
    mDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSnapshots());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.remove(SNAP.id);
    });

    expect(mDelete).toHaveBeenCalledWith(SNAP.id);
  });
});

describe('useCloudRestore', () => {
  it('passes the restore outcome through', async () => {
    const outcome = { ok: false, restored: 0, lastSyncedAt: null, error: 'cloud-empty' };
    mCloudRestore.mockResolvedValue(outcome);
    const { result } = renderHook(() => useCloudRestore());

    let returned: unknown;
    await act(async () => {
      returned = await result.current.restore();
    });

    expect(returned).toEqual(outcome);
    expect(result.current.isRestoring).toBe(false);
  });
});
