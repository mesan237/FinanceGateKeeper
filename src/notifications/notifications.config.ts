import i18n from 'i18next';

import type { NotificationType } from '@/notifications/notifications.types';

/** Default end-of-day reminder time (24-hour `HH:mm`) when the user hasn't set one. */
export const DEFAULT_REMINDER_TIME = '21:00';

/** Android notification channel id for the daily logging reminder. */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

/**
 * Android channel descriptor, created before scheduling, in the active UI
 * language. Importance is set in `notifications.service` (from
 * `AndroidImportance`) since it's an SDK enum.
 */
export function reminderChannel(): { name: string; description: string } {
  return {
    name: i18n.t('channel.name', { ns: 'notifications' }),
    description: i18n.t('channel.description', { ns: 'notifications' }),
  };
}

/**
 * Default title and body for a notification type, in the active UI language.
 * Read at build time, so a notification is worded in whatever language the app
 * was in when it was scheduled — Settings re-schedules the daily reminder when
 * the language changes.
 */
export function notificationCopy(type: NotificationType): { title: string; body: string } {
  return {
    title: i18n.t(`${type}.title`, { ns: 'notifications' }),
    body: i18n.t(`${type}.body`, { ns: 'notifications' }),
  };
}
