import i18n from 'i18next';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { getLastSyncedAt, syncNow as runSync } from '@/services/sync';
import { isSyncRunning, subscribeSyncRunning } from '@/services/syncActivity';
import {
  getCurrentUser,
  signIn as cloudSignIn,
  signOut as cloudSignOut,
  signUp as cloudSignUp,
} from '@/services/supabase';

export type CloudSyncStatus = 'idle' | 'syncing' | 'error';
export type CloudAuthAction = 'sign-in' | 'sign-up' | 'sign-out';

export interface CloudSync {
  /** Signed-in account email, or null when signed out. */
  userEmail: string | null;
  signedIn: boolean;
  /** `syncing` for any sync, including the background one started at app open or foreground. */
  status: CloudSyncStatus;
  /** Timestamp of the last successful pull, or null if never synced. */
  lastSyncedAt: string | null;
  error: string | null;
  /** The account action in flight, or null. Lets the UI show it and block the others. */
  authAction: CloudAuthAction | null;
  /** Signs in; returns true on success, false on failure (error is set). */
  signIn: (email: string, password: string) => Promise<boolean>;
  /** Creates an account; returns true on success, false on failure. */
  signUp: (email: string, password: string) => Promise<boolean>;
  /** Signs out; on failure stays signed in and sets the error. */
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
  const [authAction, setAuthAction] = useState<CloudAuthAction | null>(null);
  const syncRunning = useSyncExternalStore(subscribeSyncRunning, isSyncRunning);
  const wasSyncRunning = useRef(syncRunning);

  useEffect(() => {
    const ended = wasSyncRunning.current && !syncRunning;
    wasSyncRunning.current = syncRunning;
    if (!ended) return;
    let active = true;
    void getLastSyncedAt().then((last) => {
      if (active) setLastSyncedAt(last);
    });
    return () => {
      active = false;
    };
  }, [syncRunning]);

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
      setError(result.error ?? i18n.t('errors.syncFailed'));
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setAuthAction('sign-in');
    try {
      await cloudSignIn(email, password);
      setSignedIn(true);
      setUserEmail(email);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setAuthAction(null);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    setAuthAction('sign-up');
    try {
      await cloudSignUp(email, password);
      setSignedIn(true);
      setUserEmail(email);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setAuthAction(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    setAuthAction('sign-out');
    try {
      await cloudSignOut();
      setSignedIn(false);
      setUserEmail(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAuthAction(null);
    }
  }, []);

  return {
    userEmail,
    signedIn,
    status: syncRunning ? 'syncing' : status,
    lastSyncedAt,
    error,
    authAction,
    signIn,
    signUp,
    signOut,
    syncNow,
  };
}
