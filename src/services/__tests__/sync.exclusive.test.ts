jest.mock('@/services/supabase', () => ({ getCurrentUserId: jest.fn(), supabase: {} }));
jest.mock('@/services/database', () => ({
  execute: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/services/snapshots.service', () => ({ createSnapshot: jest.fn() }));

import { restoreFromCloud, syncNow } from '@/services/sync';
import { getCurrentUserId } from '@/services/supabase';

const mUserId = getCurrentUserId as jest.Mock;
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  mUserId.mockReset();
});

/** Holds the session lookup, the first thing a sync or a restore does, until released. */
function holdSessionLookup() {
  let release: (id: string | null) => void = () => undefined;
  mUserId.mockReturnValueOnce(new Promise<string | null>((resolve) => (release = resolve)));
  mUserId.mockResolvedValue(null);
  return (id: string | null) => release(id);
}

it('joins a running sync, so a second caller never starts another', async () => {
  const release = holdSessionLookup();

  const first = syncNow();
  const second = syncNow();
  await flush();
  release(null);
  await Promise.all([first, second]);

  expect(mUserId).toHaveBeenCalledTimes(1);
});

it('starts a cloud restore only once the running sync has finished', async () => {
  const release = holdSessionLookup();

  const sync = syncNow();
  const restore = restoreFromCloud();
  await flush();
  expect(mUserId).toHaveBeenCalledTimes(1);

  release(null);
  await sync;
  await expect(restore).resolves.toMatchObject({ ok: false, error: 'not-signed-in' });
  expect(mUserId).toHaveBeenCalledTimes(2);
});

it('starts a sync only once the running cloud restore has finished', async () => {
  const release = holdSessionLookup();

  const restore = restoreFromCloud();
  const sync = syncNow();
  await flush();
  expect(mUserId).toHaveBeenCalledTimes(1);

  release(null);
  await restore;
  await expect(sync).resolves.toMatchObject({ ok: false, error: 'Not signed in' });
  expect(mUserId).toHaveBeenCalledTimes(2);
});
