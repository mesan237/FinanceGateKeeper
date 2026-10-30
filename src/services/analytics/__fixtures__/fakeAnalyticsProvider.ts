import type { AnalyticsProvider } from '../analytics.types';

/** A recorded call to `capture`. */
export interface CapturedEvent {
  event: string;
  properties: Record<string, unknown>;
}

/** An in-memory provider for tests: records what would have been sent. */
export interface FakeAnalyticsProvider extends AnalyticsProvider {
  captured: CapturedEvent[];
  screens: string[];
  enabled: boolean;
  disableCalls: number;
  /** When true, the next `capture` or `screen` throws, as a broken SDK would. */
  failNext: boolean;
}

/** Builds a fresh fake provider that records captures, screens and consent calls. */
export function createFakeAnalyticsProvider(): FakeAnalyticsProvider {
  const fake: FakeAnalyticsProvider = {
    captured: [],
    screens: [],
    enabled: false,
    disableCalls: 0,
    failNext: false,
    capture(event, properties) {
      if (fake.failNext) {
        fake.failNext = false;
        throw new Error('network down');
      }
      fake.captured.push({ event, properties });
    },
    screen(name) {
      if (fake.failNext) {
        fake.failNext = false;
        throw new Error('network down');
      }
      fake.screens.push(name);
    },
    enable() {
      fake.enabled = true;
    },
    disable() {
      fake.enabled = false;
      fake.disableCalls += 1;
    },
    flush() {},
  };
  return fake;
}
