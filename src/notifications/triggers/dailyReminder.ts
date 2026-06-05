import { MESSAGES } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Builds the repeating end-of-day reminder payload from a `HH:mm` time. Pure —
 * returns the payload only; the feature passes it to
 * `notifications.service.scheduleNotification`. Does not touch the database.
 *
 * @param time 24-hour `HH:mm` (e.g. `'21:00'`).
 * @throws if `time` is not a valid `HH:mm` value.
 */
export function buildDailyReminder(time: string): NotificationPayload {
  const match = HHMM.exec(time);
  if (!match) {
    throw new Error(`Invalid reminder time: ${time}. Expected HH:mm.`);
  }
  return {
    type: 'dailyReminder',
    title: MESSAGES.dailyReminder.title,
    body: MESSAGES.dailyReminder.body,
    schedule: {
      hour: Number(match[1]),
      minute: Number(match[2]),
      repeats: true,
    },
  };
}
