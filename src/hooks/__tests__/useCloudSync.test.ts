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
import { runSingleSync } from '@/services/syncActivity';

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

it('reports the sign-in as running until it settles, even when it fails', async () => {
  let rejectSignIn: (e: Error) => void = () => undefined;
  mSignIn.mockReturnValue(
    new Promise((_, reject) => {
      rejectSignIn = reject;
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(mGetUser).toHaveBeenCalled());
  expect(result.current.authAction).toBeNull();

  let pending: Promise<boolean> = Promise.resolve(false);
  act(() => {
    pending = result.current.signIn('a@b.com', 'wrong');
  });
  expect(result.current.authAction).toBe('sign-in');

  await act(async () => {
    rejectSignIn(new Error('Invalid login credentials'));
    await pending;
  });
  expect(result.current.authAction).toBeNull();
  expect(result.current.error).toBe('Invalid login credentials');
});

it('reports the sign-out as running, and clears it when the sign-out fails', async () => {
  let rejectSignOut: (e: Error) => void = () => undefined;
  mSignOut.mockReturnValue(
    new Promise((_, reject) => {
      rejectSignOut = reject;
    }),
  );
  const { result } = renderHook(() => useCloudSync());
  await act(async () => {
    await result.current.signIn('a@b.com', 'pw123456');
  });

  let pending: Promise<void> = Promise.resolve();
  act(() => {
    pending = result.current.signOut();
  });
  expect(result.current.authAction).toBe('sign-out');

  await act(async () => {
    rejectSignOut(new Error('network down'));
    await pending;
  });
  expect(result.current.authAction).toBeNull();
  expect(result.current.signedIn).toBe(true);
  expect(result.current.error).toBe('network down');
});

it('reports a sync started elsewhere as syncing, then rereads the backup time', async () => {
  const { result } = renderHook(() => useCloudSync());
  await waitFor(() => expect(mLastSynced).toHaveBeenCalledTimes(1));
  expect(result.current.status).toBe('idle');

  let finish: () => void = () => undefined;
  let background: Promise<void> = Promise.resolve();
  act(() => {
    background = runSingleSync(() => new Promise<void>((resolve) => (finish = resolve)));
  });
  expect(result.current.status).toBe('syncing');

  mLastSynced.mockResolvedValue('2026-11-01T08:00:00.000Z');
  await act(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    finish();
    await background;
  });

  await waitFor(() => expect(result.current.lastSyncedAt).toBe('2026-11-01T08:00:00.000Z'));
  expect(result.current.status).toBe('idle');
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
