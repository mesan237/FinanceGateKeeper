import i18n from 'i18next';

import { notificationCopy } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

/**
 * One tontine reminder (VS-52): the next contribution coming up or due today,
 * or a tontine's overdue contributions grouped. Declared here (not imported
 * from the tontines feature) because `notifications/` must not import from
 * `features/`; the feature builds a value of this shape and passes it in.
 */
export interface TontineDueInput {
  tontineName: string;
  /** How many contributions the reminder is about. */
  count: number;
  /** What they come to, in FCFA. */
  amount: number;
  /** `YYYY-MM-DD` of the (earliest) contribution. */
  dueDate: string;
  /** A heads-up ahead of the day, the day itself, or a nudge once it has passed. */
  kind: 'soon' | 'today' | 'overdue';
  /** When the phone should show it. */
  scheduledAt: Date;
}

const BODY_KEY = {
  soon: 'tontineDue.bodySoon',
  today: 'tontineDue.bodyToday',
  overdue: 'tontineDue.bodyOverdue',
} as const satisfies Record<TontineDueInput['kind'], string>;

/**
 * Builds a scheduled tontine reminder. Pure — the feature passes the payload
 * to `notifications.service.scheduleNotification`.
 */
export function buildTontineDueAlert(input: TontineDueInput): NotificationPayload {
  const body = i18n.t(BODY_KEY[input.kind], {
    ns: 'notifications',
    tontine: input.tontineName,
    count: input.count,
    amount: formatCurrency(input.amount),
    date: formatDateLong(input.dueDate),
  });
  return {
    type: 'tontineDue',
    title: notificationCopy('tontineDue').title,
    body,
    scheduledAt: input.scheduledAt,
  };
}
