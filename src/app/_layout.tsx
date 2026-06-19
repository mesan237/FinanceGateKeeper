import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/Toast';
import { ThemeProvider, useTheme, useThemeMode } from '@/theme';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { AppModeProvider } from '@/features/finance/auth/AppModeProvider';
import { AuthProvider, useAuthLock } from '@/features/finance/auth/AuthProvider';
import { AuthScreen } from '@/features/finance/auth/AuthScreen';
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
      <ThemeProvider>
        <AuthProvider>
          <AuthGate>
            <AppModeProvider>
              <RecurringAutoLogger>
                <DebtReminderScheduler>
                  <DailyReminderScheduler>
                    <ZeroDayGate
                      reminderTime={settings?.reminderTime ?? '21:00'}
                      notificationsEnabled={settings?.notificationsEnabled ?? false}
                    >
                      <ThemedShell>
                        <ToastProvider>
                          <Stack screenOptions={{ headerShown: false }} />
                        </ToastProvider>
                      </ThemedShell>
                    </ZeroDayGate>
                  </DailyReminderScheduler>
                </DebtReminderScheduler>
              </RecurringAutoLogger>
            </AppModeProvider>
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Hard PIN gate. Renders nothing until the lock state has resolved (so the tabs
 * never flash before the lock decision), shows the themed `AuthScreen` while the
 * app is unset (first-run setup) or locked, and only mounts the real app — and
 * its schedulers — once unlocked. Lives inside `AuthProvider` so it can read the
 * lock state and inside `ThemeProvider` so the lock screen is themed.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, pinState } = useAuthLock();

  if (!ready) return null;
  if (pinState !== 'unlocked') {
    return (
      <ThemedShell>
        <AuthScreen />
      </ThemedShell>
    );
  }
  return <>{children}</>;
}

/**
 * The top safe-area inset + status-bar styling, themed. Lives inside
 * `ThemeProvider` so the background and status-bar contrast track the active
 * scheme (light status-bar text on the dark ground, dark text on light).
 */
function ThemedShell({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  const { scheme } = useThemeMode();

  // Drives React Navigation's default scene background. Without this, screens
  // that don't set their own background show the navigator's light default,
  // leaving light dark-mode text unreadable on it.
  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.BACKGROUND,
        card: colors.SURFACE,
        text: colors.TEXT_PRIMARY,
        border: colors.BORDER,
        primary: colors.PRIMARY_GREEN,
        notification: colors.DANGER,
      },
    };
  }, [scheme, colors]);

  return (
    <NavThemeProvider value={navTheme}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.BACKGROUND }]} edges={['top']}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </SafeAreaView>
    </NavThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
