import { MESSAGES } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';
import { formatCurrency } from '@/utils/formatCurrency';

/**
 * The overage this trigger formats. Declared locally (rather than importing the
 * budget feature's `OverBudgetCheck`) because `notifications/` must not import
 * from `features/` — the feature passes its overage in and it duck-types onto
 * this shape, exactly like `ProjectTimelineInput`.
 */
export interface OverBudgetInput {
  /** Whole FCFA the prospective expense would exceed the budget by. */
  overage: number;
}

/**
 * Builds the over-budget alert payload. Pure — returns the payload only; the
 * over-budget modal renders this copy (the alert is in-app, never a push, per
 * `notifications/CLAUDE.md`). Does not touch the database.
 */
export function buildOverBudgetAlert({ overage }: OverBudgetInput): NotificationPayload {
  return {
    type: 'overBudget',
    title: MESSAGES.overBudget.title,
    body: `This expense puts you ${formatCurrency(overage)} over your monthly expense budget.`,
  };
}
