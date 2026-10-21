import React from 'react';

import { useTontineReminders } from './tontines.hooks';

/**
 * Mounted once near the app root (like `PlannedReminderScheduler`): keeps the
 * tontine reminders and the "needs attention" counts behind the drawer dot up
 * to date (VS-52). Renders its children untouched.
 */
export function TontineReminderScheduler({ children }: { children: React.ReactNode }) {
  useTontineReminders();
  return <>{children}</>;
}
