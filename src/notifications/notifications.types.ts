export type NotificationType =
  | 'dailyReminder'
  | 'zeroDayCheck'
  | 'overBudget'
  | 'debtDueDate'
  | 'projectTimeline';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  scheduledAt?: Date;
}
