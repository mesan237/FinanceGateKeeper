import { useCallback, useEffect, useState } from 'react';

import { getLastSyncedAt, syncNow as runSync } from '@/services/sync';
import {
  getCurrentUser,
  signIn as cloudSignIn,
  signOut as cloudSignOut,
  signUp as cloudSignUp,
} from '@/services/supabase';

export type CloudSyncStatus = 'idle' | 'syncing' | 'error';

export interface CloudSync {
  /** Signed-in account email, or null when signed out. */
  userEmail: string | null;
  signedIn: boolean;
  status: CloudSyncStatus;
  /** Timestamp of the last successful pull, or null if never synced. */
  lastSyncedAt: string | null;
  error: string | null;
  /** Signs in; returns true on success, false on failure (error is set). */
  signIn: (email: string, password: string) => Promise<boolean>;
  /** Creates an account; returns true on success, false on failure. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Runs a full push+pull and refreshes status, error, and lastSyncedAt. */
  syncNow: () => Promise<void>;
}

/**
 * Cloud-backup state for the Settings UI. Wraps the Supabase auth helpers and
 * the sync engine so the auth feature can render the Cloud Backup section
 * without importing `services/` directly (shared infra is always allowed).
 */
export function useCloudSync(): CloudSync {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [user, last] = await Promise.all([getCurrentUser(), getLastSyncedAt()]);
      if (!active) return;
      if (user) {
        setSignedIn(true);
        setUserEmail(user.email);
      }
      setLastSyncedAt(last);
    })();
    return () => {
      active = false;
    };
  }, []);

  const syncNow = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    const result = await runSync();
    if (result.lastSyncedAt) setLastSyncedAt(result.lastSyncedAt);
    if (result.ok) {
      setStatus('idle');
    } else {
      setStatus('error');
      setError(result.error ?? 'Sync failed.');
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await cloudSignIn(email, password);
      setSignedIn(true);
      setUserEmail(email);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await cloudSignUp(email, password);
      setSignedIn(true);
      setUserEmail(email);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    await cloudSignOut();
    setSignedIn(false);
    setUserEmail(null);
  }, []);

  return { userEmail, signedIn, status, lastSyncedAt, error, signIn, signUp, signOut, syncNow };
}
