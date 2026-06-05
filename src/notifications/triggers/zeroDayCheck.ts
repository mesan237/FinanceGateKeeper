import { MESSAGES } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';

export interface ZeroDayCheckInput {
  hasExpensesToday: boolean;
  zeroDayConfirmed: boolean;
}

/**
 * Decides whether the zero-day prompt should fire: only when the day has no
 * logged expenses AND no explicit zero-day confirmation. Pure — the feature
 * supplies the two flags (read from the database) and acts on the result.
 */
export function shouldTriggerZeroDay({
  hasExpensesToday,
  zeroDayConfirmed,
}: ZeroDayCheckInput): boolean {
  return !hasExpensesToday && !zeroDayConfirmed;
}

/** Builds the zero-day confirmation notification payload. Pure. */
export function buildZeroDayNotification(): NotificationPayload {
  return {
    type: 'zeroDayCheck',
    title: MESSAGES.zeroDayCheck.title,
    body: MESSAGES.zeroDayCheck.body,
  };
}
