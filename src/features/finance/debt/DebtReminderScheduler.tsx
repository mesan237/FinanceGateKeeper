import React from 'react';

import { useDebtReminders } from './debt.hooks';

/**
 * App-root wrapper that reconciles debt due-date reminders on each app mount
 * (mirrors `RecurringAutoLogger`/`DailyReminderScheduler`). `useDebtReminders`
 * reads the pending debts in their reminder window and schedules a local
 * notification for each, swallowing errors so a notification hiccup never gates
 * the user out of the app. Renders `children` unchanged.
 */
export function DebtReminderScheduler({ children }: { children: React.ReactNode }) {
  useDebtReminders();
  return <>{children}</>;
}
