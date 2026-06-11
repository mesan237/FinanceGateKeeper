import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

jest.mock('@/services/sync', () => ({ syncNow: jest.fn() }));
jest.mock('@/services/supabase', () => ({ getCurrentUserId: jest.fn() }));

import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import * as sync from '@/services/sync';
import * as supabase from '@/services/supabase';

const mSyncNow = sync.syncNow as jest.Mock;
const mGetUserId = supabase.getCurrentUserId as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mSyncNow.mockResolvedValue({ ok: true, pushed: 0, pulled: 0, lastSyncedAt: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('syncs on mount when signed in', async () => {
  mGetUserId.mockResolvedValue('u1');
  renderHook(() => useBackgroundSync());
  await waitFor(() => expect(mSyncNow).toHaveBeenCalledTimes(1));
});

it('does not sync on mount when signed out', async () => {
  mGetUserId.mockResolvedValue(null);
  renderHook(() => useBackgroundSync());
  await waitFor(() => expect(mGetUserId).toHaveBeenCalled());
  expect(mSyncNow).not.toHaveBeenCalled();
});

it('syncs again when the app returns to the foreground', async () => {
  mGetUserId.mockResolvedValue('u1');
  let changeHandler: ((state: string) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    changeHandler = handler as (state: string) => void;
    return { remove: jest.fn() } as never;
  });

  renderHook(() => useBackgroundSync());
  await waitFor(() => expect(mSyncNow).toHaveBeenCalledTimes(1));

  await act(async () => {
    changeHandler?.('active');
  });
  await waitFor(() => expect(mSyncNow).toHaveBeenCalledTimes(2));
});
