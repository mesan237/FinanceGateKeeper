// The app's only door to analytics (VS-90): screens, hooks and shared code
// import from here, never from the provider adapter or the SDK.
export {
  flushAnalytics,
  getAnalyticsConsent,
  initAnalytics,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  track,
  trackedWrite,
  trackScreen,
} from './analytics.service';
export { screenNameFromSegments } from './analytics.sanitize';
export type { AnalyticsEventName, AnalyticsEventProps, DrawerFeature } from './analytics.schema';
export type { AnalyticsConsent, ConsentEntryPoint } from './analytics.types';

/** Milliseconds since `start` (from `Date.now()`), for `operation_duration_ms`. */
export function elapsedSince(start: number): number {
  return Date.now() - start;
}
