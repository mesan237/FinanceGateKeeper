import { useSegments } from 'expo-router';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  flushAnalytics,
  getAnalyticsConsent,
  initAnalytics,
  screenNameFromSegments,
  subscribeAnalyticsConsent,
  track,
  trackScreen,
} from '@/services/analytics';

// One `app_opened` per process launch, even if the root remounts.
let launchTracked = false;

/**
 * Analytics plumbing for the root layout (VS-90): loads the saved choice,
 * sends `app_opened` on launch and on each return from the background, flushes
 * the queue when the app leaves the foreground, and sends `screen_viewed` with
 * the route template each time the route changes. Every call is a no-op until
 * the user has opted in, and none of them can throw.
 */
export function useAnalyticsLifecycle(): void {
  const consent = useSyncExternalStore(subscribeAnalyticsConsent, getAnalyticsConsent);
  const segments = useSegments();
  const screenName = screenNameFromSegments(segments);

  useEffect(() => {
    void initAnalytics().then(() => {
      if (launchTracked) return;
      launchTracked = true;
      track('app_opened', { trigger: 'launch' });
    });

    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && previous !== 'active') track('app_opened', { trigger: 'foreground' });
      if (state === 'background') flushAnalytics();
      previous = state;
    });
    return () => subscription.remove();
  }, []);

  // Re-runs on a new route, and once the saved opt-in has loaded.
  useEffect(() => {
    if (consent === 'granted') trackScreen(screenName);
  }, [consent, screenName]);
}

/** Tests only: lets the next mount send `app_opened` again. */
export function resetLaunchTrackedForTests(): void {
  launchTracked = false;
}
