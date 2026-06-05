import {
  cancelNotification,
  getScheduledNotifications,
  requestPermissions,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { buildDailyReminder } from '@/notifications/triggers/dailyReminder';

import type { AppSettings } from './auth.types';

/**
 * Reconciles the scheduled daily reminder with the user's settings: cancels any
 * previously scheduled daily reminder, then (if notifications are enabled)
 * requests permission and schedules a fresh one at the configured time. Cancel-
 * then-schedule avoids duplicate reminders stacking up when the time changes.
 *
 * Lives in the auth feature (it owns the reminder settings) and uses only the
 * shared `notifications` infrastructure — no cross-feature import.
 */
export async function applyReminderSchedule(
  settings: Pick<AppSettings, 'reminderTime' | 'notificationsEnabled'>,
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
  await scheduleNotification(buildDailyReminder(settings.reminderTime));
}
