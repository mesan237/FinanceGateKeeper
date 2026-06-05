import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDER_CHANNEL, REMINDER_CHANNEL_ID } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';

/**
 * Thin wrapper over Expo Notifications. Holds no domain logic — features decide
 * WHEN to notify (via the trigger files) and HOW to read the data; this module
 * only schedules, cancels, and manages permissions.
 */

/**
 * Requests notification permission, returning whether it is granted. Checks the
 * current status first and only prompts when not already granted.
 */
export async function requestPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Ensures the Android reminder channel exists. No-op on other platforms. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: REMINDER_CHANNEL.name,
    importance: Notifications.AndroidImportance.DEFAULT,
    description: REMINDER_CHANNEL.description,
  });
}

/**
 * Schedules a local notification and returns its OS identifier. A payload with
 * a `schedule` becomes a repeating daily trigger; a `scheduledAt` becomes a
 * one-shot date trigger; neither means deliver immediately.
 */
export async function scheduleNotification(payload: NotificationPayload): Promise<string> {
  await ensureAndroidChannel();

  const content = {
    title: payload.title,
    body: payload.body,
    data: { type: payload.type },
  };

  let trigger: Notifications.NotificationTriggerInput = null;
  if (payload.schedule) {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: payload.schedule.hour,
      minute: payload.schedule.minute,
      channelId: REMINDER_CHANNEL_ID,
    };
  } else if (payload.scheduledAt) {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: payload.scheduledAt,
      channelId: REMINDER_CHANNEL_ID,
    };
  }

  return Notifications.scheduleNotificationAsync({ content, trigger });
}

/** Cancels a previously scheduled notification by its identifier. */
export async function cancelNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/** Returns all currently scheduled notification requests. */
export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}
