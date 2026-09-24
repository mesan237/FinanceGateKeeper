import type { NotificationType } from '@/notifications/notifications.types';

/** Default end-of-day reminder time (24-hour `HH:mm`) when the user hasn't set one. */
export const DEFAULT_REMINDER_TIME = '21:00';

/** Android notification channel id for the daily logging reminder. */
export const REMINDER_CHANNEL_ID = 'daily-reminder';

/**
 * Android channel descriptor, created before scheduling. Importance is set in
 * `notifications.service` (from `AndroidImportance`) since it's an SDK enum.
 */
export const REMINDER_CHANNEL = {
  name: 'Daily reminders',
  description: 'End-of-day reminders to log your spending.',
};

/** Default copy per notification type. Single hard-coded FCFA-context message set. */
export const MESSAGES: Record<NotificationType, { title: string; body: string }> = {
  dailyReminder: {
    title: 'Log your spending',
    body: "Take a few seconds to record today's expenses before the day ends.",
  },
  zeroDayCheck: {
    title: 'Did you spend nothing today?',
    body: 'Confirm you spent nothing today, or log what you spent.',
  },
  overBudget: {
    title: 'Over budget',
    body: 'This expense puts you over your budget.',
  },
  debtDueDate: {
    title: 'Debt due soon',
    body: 'A debt is approaching its due date.',
  },
};
