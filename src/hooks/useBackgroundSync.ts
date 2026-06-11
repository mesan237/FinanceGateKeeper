import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { syncNow } from '@/services/sync';
import { getCurrentUserId } from '@/services/supabase';

/**
 * Runs a cloud sync on app open and each time the app returns to the foreground,
 * but only while a Supabase session exists. Mounted once by the root layout —
 * the established composition seam — so sync state never leaks into a feature.
 * `syncNow` is itself a no-op when signed out or offline, so this is best-effort
 * and never blocks the UI.
 */
export function useBackgroundSync(): void {
  useEffect(() => {
    let mounted = true;

    const maybeSync = async () => {
      const userId = await getCurrentUserId();
      if (mounted && userId) void syncNow();
    };

    void maybeSync();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void maybeSync();
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
}
