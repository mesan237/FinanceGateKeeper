import { notificationCopy } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';
import { toISODate } from '@/utils/formatDate';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * How many days ahead the reminder is planned. It is re-planned on every open
 * and every return to the app, so this only matters for someone who stops
 * opening it: they keep getting nudged for two weeks.
 */
export const REMINDER_DAYS_AHEAD = 14;

/**
 * Plans the end-of-day logging reminder as one dated notification per day
 * (VS-57), from today, at `time` local. A day that already has an entry is
 * skipped, so someone who has logged today is not reminded to log today — a
 * repeating daily alarm could not know that. Pure: the feature reads the logged
 * days and schedules the payloads.
 *
 * @param time 24-hour `HH:mm` (e.g. `'21:00'`).
 * @param now The moment of planning; a reminder at or before it is dropped.
 * @param loggedDays Days (`YYYY-MM-DD`, as `toISODate` stamps entries) with an entry.
 * @throws if `time` is not a valid `HH:mm` value.
 */
export function buildDailyReminders(
  time: string,
  now: Date,
  loggedDays: ReadonlySet<string>,
): NotificationPayload[] {
  const match = HHMM.exec(time);
  if (!match) {
    throw new Error(`Invalid reminder time: ${time}. Expected HH:mm.`);
  }
  const copy = notificationCopy('dailyReminder');

  const reminders: NotificationPayload[] = [];
  for (let offset = 0; offset < REMINDER_DAYS_AHEAD; offset += 1) {
    const at = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      Number(match[1]),
      Number(match[2]),
    );
    if (at <= now || loggedDays.has(toISODate(at))) continue;
    reminders.push({ type: 'dailyReminder', ...copy, scheduledAt: at });
  }
  return reminders;
}
