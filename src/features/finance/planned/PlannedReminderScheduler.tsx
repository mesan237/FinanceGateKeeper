import React from 'react';

import { usePlannedReminders } from './planned.hooks';

/**
 * Mounted once near the app root (like `DebtReminderScheduler`): keeps the
 * planned-purchase reminders and the "needs attention" counts behind the
 * drawer dot and the dashboard line up to date. Renders its children untouched.
 */
export function PlannedReminderScheduler({ children }: { children: React.ReactNode }) {
  usePlannedReminders();
  return <>{children}</>;
}
