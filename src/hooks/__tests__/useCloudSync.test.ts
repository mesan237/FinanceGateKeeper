import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/supabase', () => ({
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
}));
jest.mock('@/services/sync', () => ({
  syncNow: jest.fn(),
  getLastSyncedAt: jest.fn(),
}));

import { useCloudSync } from '@/hooks/useCloudSync';
import * as sync from '@/services/sync';
import * as supabase from '@/services/supabase';

const mGetUser = supabase.getCurrentUser as jest.Mock;
const mSignIn = supabase.signIn as jest.Mock;
const mSignOut = supabase.signOut as jest.Mock;
const mSyncNow = sync.syncNow as jest.Mock;
const mLastSynced = sync.getLastSyncedAt as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mGetUser.mockResolvedValue(null);
  mLastSynced.mockResolvedValue(null);
  mSignIn.mockResolvedValue(undefined);
  mSignOut.mockResolvedValue(undefined);
  mSyncNow.mockResolvedValue({
    ok: true,
    pushed: 0,
    pulled: 0,
    lastSyncedAt: '2026-06-10T00:00:00.000Z',
  });
});

it('reports signed-out on mount and signed-in after a successful sign-in', async () => {
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.signedIn).toBe(false));

  await act(async () => {
    await result.current.signIn('a@b.com', 'pw123456');
  });

  expect(result.current.signedIn).toBe(true);
  expect(result.current.userEmail).toBe('a@b.com');
});

it('drives status and lastSyncedAt through a successful syncNow', async () => {
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe('idle'));

  await act(async () => {
    await result.current.syncNow();
  });

  expect(mSyncNow).toHaveBeenCalled();
  expect(result.current.status).toBe('idle');
  expect(result.current.lastSyncedAt).toBe('2026-06-10T00:00:00.000Z');
});

it('surfaces an error status and message when syncNow fails', async () => {
  mSyncNow.mockResolvedValue({ ok: false, pushed: 0, pulled: 0, lastSyncedAt: null, error: 'network down' });
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(result.current.status).toBe('idle'));

  await act(async () => {
    await result.current.syncNow();
  });

  expect(result.current.status).toBe('error');
  expect(result.current.error).toBe('network down');
});

it('clears the account on sign-out', async () => {
  const { result } = renderHook(() => useCloudSync());
  await act(async () => {
    await result.current.signIn('a@b.com', 'pw123456');
  });
  expect(result.current.signedIn).toBe(true);

  await act(async () => {
    await result.current.signOut();
  });

  expect(result.current.signedIn).toBe(false);
  expect(result.current.userEmail).toBeNull();
});
