import { PostHog, PostHogPersistedProperty, type PostHogCustomAppProperties } from 'posthog-react-native';

import type { AnalyticsProvider } from './analytics.types';

/** PostHog's EU cloud; override with EXPO_PUBLIC_POSTHOG_HOST. */
const DEFAULT_HOST = 'https://eu.i.posthog.com';

/**
 * Keeps the app and OS context needed to compare releases and drops the rest
 * of what the SDK gathers by default: device name (often the owner's name),
 * model, manufacturer, locale and timezone.
 */
function keepReleaseContext(p: PostHogCustomAppProperties): PostHogCustomAppProperties {
  return {
    $app_name: p.$app_name,
    $app_namespace: p.$app_namespace,
    $app_version: p.$app_version,
    $app_build: p.$app_build,
    $os_name: p.$os_name,
    $os_version: p.$os_version,
    $device_type: p.$device_type,
    $is_emulator: p.$is_emulator,
  };
}

/**
 * Builds the PostHog provider (VS-90), or null when no project key is set
 * (local development, tests), in which case nothing is ever sent. Every
 * automatic collection is off: no autocapture, screen autocapture, lifecycle
 * events, session replay, error autocapture, surveys, feature-flag preload or
 * GeoIP. Events stay anonymous (`personProfiles: 'never'`; the app never calls
 * `identify`). The SDK keeps a bounded on-disk queue (200 events) and sends in
 * batches every 30 seconds or 20 events.
 */
export function createPostHogProvider(): AnalyticsProvider | null {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;

  const client = new PostHog(apiKey, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
    defaultOptIn: false,
    personProfiles: 'never',
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    errorTracking: { autocapture: false },
    preloadFeatureFlags: false,
    disableSurveys: true,
    disableGeoip: true,
    flushAt: 20,
    flushInterval: 30_000,
    maxBatchSize: 50,
    maxQueueSize: 200,
    fetchRetryCount: 2,
    customAppProperties: keepReleaseContext,
  });

  return {
    capture: (event, properties) => {
      client.capture(event, properties as Parameters<PostHog['capture']>[1]);
    },
    screen: (name, properties) => {
      void client.screen(name, properties as Parameters<PostHog['screen']>[1]);
    },
    enable: () => {
      void client.optIn();
    },
    disable: () => {
      // `reset` forgets the anonymous id (and, with defaultOptIn false, leaves
      // the client opted out); the queue survives a reset, so drop it too.
      client.reset();
      void client.optOut();
      client.setPersistedProperty(PostHogPersistedProperty.Queue, null);
    },
    flush: () => {
      void client.flush();
    },
  };
}
