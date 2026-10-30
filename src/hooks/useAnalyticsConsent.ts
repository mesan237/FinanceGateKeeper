import { useCallback, useSyncExternalStore } from 'react';

import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
  type ConsentEntryPoint,
} from '@/services/analytics';

/**
 * The user's optional-analytics choice on this phone (VS-90), live across
 * screens: the set-up and Preferences show the same switch. `enabled` is false
 * until the user turns it on. `setEnabled` saves and applies the choice and
 * rejects only if it could not be saved.
 */
export function useAnalyticsConsent(entryPoint: ConsentEntryPoint): {
  consent: AnalyticsConsent;
  enabled: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
} {
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent);
  const setEnabled = useCallback(
    (enabled: boolean) => setAnalyticsConsent(enabled, entryPoint),
    [entryPoint],
  );
  return { consent, enabled: consent === 'granted', setEnabled };
}
