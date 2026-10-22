import React, { useEffect } from 'react';
import { AppState } from 'react-native';

import { getAppSettings } from './auth.service';
import { applyReminderSchedule } from './reminder';

/**
 * App-root wrapper that keeps the daily reminders in step with the saved
 * settings and with what has been logged (VS-57). It re-plans on mount, when
 * the app goes to the background — so an entry logged just now cancels today's
 * reminder — and when it returns, since the day may have turned. Errors are
 * swallowed to console so a notification/permission hiccup never gates the user
 * out of the app. Renders `children` unchanged.
 */
export function DailyReminderScheduler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const run = async () => {
      try {
        const settings = await getAppSettings();
        await applyReminderSchedule(settings);
      } catch (e) {
        console.error('Daily reminder scheduling failed:', e);
      }
    };

    void run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'active') void run();
    });
    return () => subscription.remove();
  }, []);

  return <>{children}</>;
}
