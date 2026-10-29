/** Whether the user has agreed to optional product analytics on this phone. */
export type AnalyticsConsent = 'granted' | 'denied' | 'unset';

/** Where the user turned analytics on (the `analytics_enabled` entry point). */
export type ConsentEntryPoint = 'onboarding' | 'settings';

/**
 * The only seam between the app and an analytics SDK. Everything that reaches
 * it has already passed consent and the allowlist; an implementation must not
 * add properties of its own beyond the SDK's documented app/OS context.
 */
export interface AnalyticsProvider {
  /** Queues one event; the SDK batches and sends it. */
  capture(event: string, properties: Record<string, unknown>): void;
  /** Records a screen view under a route template such as `/expenses/[id]`. */
  screen(name: string, properties: Record<string, unknown>): void;
  /** Starts sending (after the user opted in). */
  enable(): void;
  /** Stops sending, forgets the anonymous id and drops anything still queued. */
  disable(): void;
  /** Sends what is queued now, e.g. as the app goes to the background. */
  flush(): void;
}
