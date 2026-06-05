import React, { useEffect } from 'react';

import { getAppSettings } from './auth.service';
import { applyReminderSchedule } from './reminder';

/**
 * App-root wrapper that reconciles the scheduled daily reminder with the saved
 * settings on each app mount (mirrors `RecurringAutoLogger`). Errors are
 * swallowed to console so a notification/permission hiccup never gates the user
 * out of the app. Renders `children` unchanged.
 */
export function DailyReminderScheduler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void (async () => {
      try {
        const settings = await getAppSettings();
        await applyReminderSchedule(settings);
      } catch (e) {
        console.error('Daily reminder scheduling failed:', e);
      }
    })();
  }, []);

  return <>{children}</>;
}
