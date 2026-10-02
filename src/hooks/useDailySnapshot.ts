import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ensureDailySnapshot } from '@/services/snapshots.service';

/**
 * Takes the day's automatic local snapshot on app open and each time the app
 * returns to the foreground (a no-op once today's exists). Mounted once by the
 * root layout inside the unlocked tree, beside `useBackgroundSync`. Best-effort:
 * a failed snapshot is swallowed and never blocks render. A foreground event
 * while a check is still running is skipped, so a cold start can't take two.
 */
export function useDailySnapshot(): void {
  const inFlight = useRef(false);

  useEffect(() => {
    const snapshot = () => {
      if (inFlight.current) return;
      inFlight.current = true;
      ensureDailySnapshot()
        .catch(() => {
          // A missed daily snapshot is retried on the next open or foreground.
        })
        .finally(() => {
          inFlight.current = false;
        });
    };

    snapshot();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') snapshot();
    });

    return () => subscription.remove();
  }, []);
}
