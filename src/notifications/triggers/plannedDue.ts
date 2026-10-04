import i18n from 'i18next';

import { notificationCopy } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

/**
 * One reminder for a shopping list's items falling due on the same day.
 * Declared here (not imported from the planned feature) because
 * `notifications/` must not import from `features/`; the feature builds a
 * value of this shape and passes it in.
 */
export interface PlannedDueInput {
  listName: string;
  /** How many items are still to buy for that day. */
  count: number;
  /** Their estimated total, in FCFA. */
  total: number;
  /** `YYYY-MM-DD`. */
  dueDate: string;
  /** A heads-up ahead of the day, the day itself, or a nudge once it has passed. */
  kind: 'soon' | 'today' | 'overdue';
  /** When the phone should show it. */
  scheduledAt: Date;
}

const BODY_KEY = {
  soon: 'plannedDue.bodySoon',
  today: 'plannedDue.bodyToday',
  overdue: 'plannedDue.bodyOverdue',
} as const satisfies Record<PlannedDueInput['kind'], string>;

/**
 * Builds a scheduled planned-purchase reminder. Pure — the feature passes the
 * payload to `notifications.service.scheduleNotification`.
 */
export function buildPlannedDueAlert(input: PlannedDueInput): NotificationPayload {
  const body = i18n.t(BODY_KEY[input.kind], {
    ns: 'notifications',
    list: input.listName,
    count: input.count,
    amount: formatCurrency(input.total),
    date: formatDateLong(input.dueDate),
  });
  return {
    type: 'plannedDue',
    title: notificationCopy('plannedDue').title,
    body,
    scheduledAt: input.scheduledAt,
  };
}
