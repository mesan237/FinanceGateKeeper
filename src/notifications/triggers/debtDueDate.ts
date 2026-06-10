import { MESSAGES } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';
import { formatCurrency } from '@/utils/formatCurrency';

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
  const amount = formatCurrency(input.amount);
  const body =
    input.kind === 'overdue'
      ? `${input.personName} — ${amount} is overdue (was due ${input.dueDate}).`
      : `${input.personName} — ${amount} is due on ${input.dueDate}.`;
  return {
    type: 'debtDueDate',
    title: MESSAGES.debtDueDate.title,
    body,
  };
}
