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
  /**
   * The category whose envelope is being exceeded. Omit for the month-wide
   * budget. Naming the envelope is what makes the warning actionable — "over
   * your Food budget" tells the user which decision to revisit, where "over
   * your budget" only tells them to feel bad.
   */
  categoryName?: string;
}

/**
 * Builds the over-budget alert payload. Pure — returns the payload only; the
 * over-budget modal renders this copy (the alert is in-app, never a push, per
 * `notifications/CLAUDE.md`). Does not touch the database.
 */
export function buildOverBudgetAlert({
  overage,
  categoryName,
}: OverBudgetInput): NotificationPayload {
  const scope = categoryName ? `your ${categoryName} budget` : 'your monthly expense budget';
  return {
    type: 'overBudget',
    title: MESSAGES.overBudget.title,
    body: `This expense puts you ${formatCurrency(overage)} over ${scope}.`,
  };
}
