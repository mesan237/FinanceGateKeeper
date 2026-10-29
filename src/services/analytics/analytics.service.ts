import { activeLanguage } from '@/i18n';
import { getPreference, setPreference } from '@/services/uiPreferences';

import { createPostHogProvider } from './analytics.posthog';
import { COMMON_PROPERTIES, type AnalyticsEventName, type AnalyticsEventProps } from './analytics.schema';
import { sanitizeEvent, sanitizeProperties } from './analytics.sanitize';
import type { AnalyticsConsent, AnalyticsProvider, ConsentEntryPoint } from './analytics.types';

/** The `ui_preferences` key holding the choice; local to this phone, never synced. */
const CONSENT_KEY = 'analytics_consent';

let consent: AnalyticsConsent = 'unset';
let provider: AnalyticsProvider | null = null;
let providerFactory: () => AnalyticsProvider | null = createPostHogProvider;
let initPromise: Promise<void> | null = null;
let lastScreen: string | null = null;
const listeners = new Set<() => void>();

function reportFailure(where: string, e: unknown): void {
  if (__DEV__) console.warn(`Analytics ${where} failed:`, e);
}

/** Creates the provider on first need: no SDK runs, and nothing is fetched, before an opt-in. */
function ensureProvider(): AnalyticsProvider | null {
  if (provider) return provider;
  try {
    provider = providerFactory();
  } catch (e) {
    reportFailure('setup', e);
    provider = null;
  }
  return provider;
}

function setConsentState(next: AnalyticsConsent): void {
  consent = next;
  listeners.forEach((listener) => listener());
}

/**
 * Loads the saved analytics choice once per launch and, only if the user opted
 * in, starts the provider. Safe to call repeatedly; never throws.
 */
export function initAnalytics(): Promise<void> {
  initPromise ??= (async () => {
    try {
      const saved = await getPreference(CONSENT_KEY);
      if (saved !== 'granted' && saved !== 'denied') return;
      setConsentState(saved);
      if (saved === 'granted') ensureProvider()?.enable();
    } catch (e) {
      reportFailure('init', e);
    }
  })();
  return initPromise;
}

/** The current choice: `unset` until the user decides (analytics stays off). */
export function getAnalyticsConsent(): AnalyticsConsent {
  return consent;
}

/** Subscribes to consent changes; returns the unsubscribe function. */
export function subscribeAnalyticsConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Records the user's choice on this phone and applies it at once. Opting in
 * starts the provider and sends `analytics_enabled`; opting out stops sending,
 * drops anything still queued and forgets the anonymous id, so a later opt-in
 * starts a new, unlinked one. Rejects only if the choice could not be saved.
 */
export async function setAnalyticsConsent(granted: boolean, entryPoint: ConsentEntryPoint): Promise<void> {
  await setPreference(CONSENT_KEY, granted ? 'granted' : 'denied');
  setConsentState(granted ? 'granted' : 'denied');
  try {
    if (granted) {
      ensureProvider()?.enable();
      track('analytics_enabled', { entry_point: entryPoint });
    } else {
      provider?.disable();
      lastScreen = null;
    }
  } catch (e) {
    reportFailure('consent', e);
  }
}

function commonProperties(): Record<string, unknown> {
  return sanitizeProperties(COMMON_PROPERTIES, { app_language: activeLanguage() });
}

/**
 * Sends one catalogue event, if the user opted in. Properties pass the
 * allowlist first. Fire-and-forget: it never throws and never waits, so it
 * cannot slow down or break the action it describes. Call it only after the
 * outcome is known — `expense_created` once the save resolved.
 */
export function track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventProps<E> = {}): void {
  if (consent !== 'granted') return;
  try {
    const clean = sanitizeEvent(event, properties as Record<string, unknown>);
    if (!clean) return;
    ensureProvider()?.capture(event, { ...clean, ...commonProperties() });
  } catch (e) {
    reportFailure(`track(${event})`, e);
  }
}

/**
 * Sends `screen_viewed` for a route template, if the user opted in, and only
 * when it differs from the last one sent — a re-render or a re-focus of the
 * same screen is not a new view.
 */
export function trackScreen(screenName: string): void {
  if (consent !== 'granted' || screenName === lastScreen) return;
  try {
    const clean = sanitizeEvent('screen_viewed', { screen_name: screenName });
    if (!clean?.screen_name) return;
    lastScreen = screenName;
    ensureProvider()?.screen(screenName, commonProperties());
  } catch (e) {
    reportFailure('screen', e);
  }
}

/** Asks the provider to send its queue now (e.g. on going to the background). */
export function flushAnalytics(): void {
  if (consent !== 'granted') return;
  try {
    provider?.flush();
  } catch (e) {
    reportFailure('flush', e);
  }
}

/** Tests only: replaces the provider factory (default: PostHog). */
export function setAnalyticsProviderFactoryForTests(factory: () => AnalyticsProvider | null): void {
  providerFactory = factory;
}

/** Tests only: forgets the loaded choice, the provider and the last screen. */
export function resetAnalyticsForTests(): void {
  consent = 'unset';
  provider = null;
  initPromise = null;
  lastScreen = null;
  providerFactory = createPostHogProvider;
  listeners.clear();
}
