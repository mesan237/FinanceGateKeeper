import i18n from 'i18next';

import { notificationCopy } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

/**
 * The reminder data this trigger formats. Declared locally (structurally
 * compatible with the debt feature's `DebtReminder`) because `notifications/`
 * must not import from `features/` — the feature passes its reminder object in
 * and it duck-types onto this shape (mirrors `ProjectTimelineInput`).
 */
export interface DebtDueInput {
  personName: string;
  amount: number;
  dueDate: string;
  kind: 'dueSoon' | 'overdue';
}

/**
 * Builds the debt due-date reminder payload. Pure — returns the payload only;
 * the feature passes it to `notifications.service.scheduleNotification`. Does
 * not touch the database. The body differs for an approaching vs. an overdue
 * debt so the user can tell them apart at a glance.
 */
export function buildDebtDueAlert(input: DebtDueInput): NotificationPayload {
  const params = {
    ns: 'notifications',
    person: input.personName,
    amount: formatCurrency(input.amount),
    date: formatDateLong(input.dueDate),
  } as const;
  const body =
    input.kind === 'overdue'
      ? i18n.t('debtDueDate.bodyOverdue', params)
      : i18n.t('debtDueDate.bodyDueSoon', params);
  return {
    type: 'debtDueDate',
    title: notificationCopy('debtDueDate').title,
    body,
  };
}
