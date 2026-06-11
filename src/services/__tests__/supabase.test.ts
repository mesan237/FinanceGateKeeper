import * as fake from '@supabase/supabase-js';

import { getCurrentUser, getCurrentUserId, signIn, signOut, signUp } from '@/services/supabase';

const mock = fake as unknown as {
  __reset(): void;
  __fail(err: string | null): void;
  __setSession(session: unknown): void;
};

beforeEach(() => {
  mock.__reset();
});

describe('auth helpers', () => {
  it('signUp resolves on success', async () => {
    await expect(signUp('a@b.com', 'pw123456')).resolves.toBeUndefined();
  });

  it('signIn throws the Supabase error message on failure', async () => {
    mock.__fail('Invalid login credentials');
    await expect(signIn('a@b.com', 'wrong')).rejects.toThrow('Invalid login credentials');
  });

  it('signOut calls through without error', async () => {
    await signIn('a@b.com', 'pw123456');
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('getCurrentUserId returns null when signed out and the id when signed in', async () => {
    expect(await getCurrentUserId()).toBeNull();
    await signIn('a@b.com', 'pw123456');
    expect(await getCurrentUserId()).toBe('user-a@b.com');
  });

  it('getCurrentUser returns null when signed out and id+email when signed in', async () => {
    expect(await getCurrentUser()).toBeNull();
    await signIn('a@b.com', 'pw123456');
    expect(await getCurrentUser()).toEqual({ id: 'user-a@b.com', email: 'a@b.com' });
  });
});
