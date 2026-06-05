import { Stack } from 'expo-router';
import React from 'react';

import { AppModeProvider } from '@/features/finance/auth/AppModeProvider';
import { DailyReminderScheduler } from '@/features/finance/auth/DailyReminderScheduler';
import { useAppSettings } from '@/features/finance/auth/auth.hooks';
import { DebtReminderScheduler } from '@/features/finance/debt/DebtReminderScheduler';
import { RecurringAutoLogger } from '@/features/finance/expenses/RecurringAutoLogger';
import { ZeroDayGate } from '@/features/finance/expenses/ZeroDayGate';

export default function RootLayout() {
  // The root layout is the only seam allowed to read auth settings AND mount an
  // expenses component: it injects the reminder prefs into ZeroDayGate so the
  // expenses feature never imports the auth feature (see ISSUE-008 decision #2).
  const { settings } = useAppSettings();

  return (
    <AppModeProvider>
      <RecurringAutoLogger>
        <DebtReminderScheduler>
          <DailyReminderScheduler>
            <ZeroDayGate
              reminderTime={settings?.reminderTime ?? '21:00'}
              notificationsEnabled={settings?.notificationsEnabled ?? false}
            >
              <Stack screenOptions={{ headerShown: false }} />
            </ZeroDayGate>
          </DailyReminderScheduler>
        </DebtReminderScheduler>
      </RecurringAutoLogger>
    </AppModeProvider>
  );
}
