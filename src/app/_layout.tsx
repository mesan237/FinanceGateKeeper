import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { BACKGROUND } from '@/constants/colors';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { AppModeProvider } from '@/features/finance/auth/AppModeProvider';
import { DailyReminderScheduler } from '@/features/finance/auth/DailyReminderScheduler';
import { useAppSettings } from '@/features/finance/auth/auth.hooks';
import { DebtReminderScheduler } from '@/features/finance/debt/DebtReminderScheduler';
import { RecurringAutoLogger } from '@/features/finance/expenses/RecurringAutoLogger';
import { ZeroDayGate } from '@/features/finance/expenses/ZeroDayGate';

// Keep the splash screen up until the custom fonts have loaded, so text never
// flashes in a fallback system face first.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // The root layout is the only seam allowed to read auth settings AND mount an
  // expenses component: it injects the reminder prefs into ZeroDayGate so the
  // expenses feature never imports the auth feature (see ISSUE-008 decision #2).
  const { settings } = useAppSettings();

  // Best-effort cloud backup: pull/push on app open and foreground when signed
  // in. No-op when signed out or offline; never blocks render.
  useBackgroundSync();

  // Poppins powers headings/display; Work Sans powers body copy and numbers.
  // Each weight is loaded as its own family — see @/constants/fonts.
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // SDK 54 / RN 0.81 turns on Android edge-to-edge by default, so content draws
  // under the status bar. A single top-edge SafeAreaView here insets every
  // screen at once (react-native's own SafeAreaView is a no-op on Android).
  return (
    <SafeAreaProvider>
      <AppModeProvider>
        <RecurringAutoLogger>
          <DebtReminderScheduler>
            <DailyReminderScheduler>
              <ZeroDayGate
                reminderTime={settings?.reminderTime ?? '21:00'}
                notificationsEnabled={settings?.notificationsEnabled ?? false}
              >
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                  <StatusBar style="dark" />
                  <ToastProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                  </ToastProvider>
                </SafeAreaView>
              </ZeroDayGate>
            </DailyReminderScheduler>
          </DebtReminderScheduler>
        </RecurringAutoLogger>
      </AppModeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
});
