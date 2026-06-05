export type NotificationType =
  | 'dailyReminder'
  | 'zeroDayCheck'
  | 'overBudget'
  | 'debtDueDate'
  | 'projectTimeline';

/**
 * A repeating calendar trigger — fires every day at `hour`:`minute` local time.
 * Used by the daily reminder. Kept separate from `scheduledAt` (one-shot).
 */
export interface NotificationSchedule {
  hour: number;
  minute: number;
  repeats: boolean;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  /** One-shot delivery at a specific moment. */
  scheduledAt?: Date;
  /** Repeating daily delivery; takes precedence over `scheduledAt` when set. */
  schedule?: NotificationSchedule;
}
