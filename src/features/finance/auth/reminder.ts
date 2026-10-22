import {
  cancelNotification,
  getScheduledNotifications,
  requestPermissions,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { buildDailyReminders, REMINDER_DAYS_AHEAD } from '@/notifications/triggers/dailyReminder';
import { getLoggedDays } from '@/services/transactions';
import { toISODate } from '@/utils/formatDate';

import type { AppSettings } from './auth.types';

/**
 * Reconciles the scheduled daily reminders with the user's settings: cancels
 * every previously scheduled daily reminder, then (if notifications are enabled
 * and permitted) plans one dated reminder a day for the next two weeks, leaving
 * out any day that already has an entry (VS-57). Cancel-then-schedule keeps
 * reminders from stacking up when the time changes or the plan is re-run.
 *
 * Lives in the auth feature (it owns the reminder settings) and uses only shared
 * infrastructure — `notifications` and `services/transactions` for the logged
 * days — so it needs no cross-feature import.
 *
 * @param now Injectable for tests.
 */
export async function applyReminderSchedule(
  settings: Pick<AppSettings, 'reminderTime' | 'notificationsEnabled'>,
  now: Date = new Date(),
): Promise<void> {
  const scheduled = await getScheduledNotifications();
  await Promise.all(
    scheduled
      .filter((n) => n.content?.data?.type === 'dailyReminder')
      .map((n) => cancelNotification(n.identifier)),
  );

  if (!settings.notificationsEnabled) return;

  const granted = await requestPermissions();
  if (!granted) return;

  const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + REMINDER_DAYS_AHEAD, 23, 59);
  const logged = await getLoggedDays(toISODate(now), toISODate(windowEnd));
  for (const reminder of buildDailyReminders(settings.reminderTime, now, logged)) {
    await scheduleNotification(reminder);
  }
}
