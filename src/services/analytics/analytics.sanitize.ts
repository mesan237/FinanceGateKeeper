import { ANALYTICS_EVENTS, type AnalyticsEventName, type PropertySpec } from './analytics.schema';

/** The longest duration we accept, in milliseconds (10 minutes). */
const MAX_DURATION_MS = 600_000;

/** One route segment: lowercase words with hyphens, or a `[param]` placeholder. */
const ROUTE_SEGMENT = /^([a-z]+(-[a-z]+)*|\[[a-zA-Z]+\])$/;

function isRouteTemplate(value: string): boolean {
  if (value === '/') return true;
  if (!value.startsWith('/')) return false;
  return value.slice(1).split('/').every((segment) => ROUTE_SEGMENT.test(segment));
}

/** Returns the value as it may be sent, or undefined when the spec rejects it. */
function cleanValue(spec: PropertySpec, value: unknown): unknown {
  switch (spec.kind) {
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value) ? value : undefined;
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    case 'duration': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      const ms = Math.round(value);
      return ms >= 0 && ms <= MAX_DURATION_MS ? ms : undefined;
    }
    case 'route':
      return typeof value === 'string' && isRouteTemplate(value) ? value : undefined;
  }
}

/** Keeps only the properties `specs` lists, each with a valid value; drops everything else. */
export function sanitizeProperties(
  specs: Record<string, PropertySpec>,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(specs)) {
    const value = cleanValue(spec, properties[key]);
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

/**
 * Applies the allowlist (VS-90) to one event: the properties the catalogue
 * lists for it, with valid values. Returns null for an event the catalogue does
 * not know, which is then not sent at all.
 */
export function sanitizeEvent(
  event: AnalyticsEventName,
  properties: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!Object.prototype.hasOwnProperty.call(ANALYTICS_EVENTS, event)) return null;
  return sanitizeProperties(ANALYTICS_EVENTS[event], properties);
}

/**
 * Turns Expo Router segments into the route template sent as `screen_name`:
 * route groups such as `(tabs)` and a trailing `index` are dropped, and dynamic
 * segments stay as placeholders (`/expenses/[id]`), so no record id is sent.
 */
export function screenNameFromSegments(segments: readonly string[]): string {
  const visible = segments.filter((s) => !(s.startsWith('(') && s.endsWith(')')) && s !== 'index');
  return `/${visible.join('/')}`;
}
