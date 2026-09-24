import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TimeField } from '@/components/TimeField';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { useTheme, useThemeMode, useThemedStyles, type ThemeColors, type ThemeMode } from '@/theme';

import { CloudAccountCard } from './CloudAccountCard';
import { useAppSettings } from './auth.hooks';
import { applyReminderSchedule } from './reminder';

/**
 * App settings: set the daily reminder time and toggle notifications.
 * Reminder/notification changes reconcile the scheduled notification via
 * `applyReminderSchedule` (shared notifications infra).
 */
export function SettingsScreen() {
  const { settings, setReminderTime, setNotificationsEnabled } = useAppSettings();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const router = useRouter();
  const c = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [reminderInput, setReminderInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Seed the editable reminder field once settings load.
  useEffect(() => {
    if (settings) setReminderInput(settings.reminderTime);
  }, [settings]);

  if (!settings) {
    return (
      <View style={styles.loading}>
        <Typography variant="muted">Loading settings…</Typography>
      </View>
    );
  }

  const saveReminder = async () => {
    try {
      await setReminderTime(reminderInput);
      await applyReminderSchedule({
        reminderTime: reminderInput,
        notificationsEnabled: settings.notificationsEnabled,
      });
      setError(null);
    } catch (e) {
      // The picker only yields a valid HH:mm, so this surfaces genuine save
      // failures — not a format error.
      setError(e instanceof Error ? e.message : "Couldn't save the reminder.");
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    await setNotificationsEnabled(enabled);
    await applyReminderSchedule({ reminderTime: settings.reminderTime, notificationsEnabled: enabled });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Settings" />

      <Pressable
        testID="settings-profile-link"
        accessibilityRole="button"
        onPress={() => router.push('/profile')}
      >
        <SectionCard
          icon="profile"
          title="Profile"
          subtitle="Your name, avatar, and account."
          right={<Icon name="forward" color={c.TEXT_MUTED} />}
        />
      </Pressable>

      <SectionCard
        icon="appearance"
        title="Appearance"
        subtitle="Choose a light or dark look, or follow your device."
      >
        <SegmentedControl
          testID="settings-theme-control"
          value={themeMode}
          segments={[
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
          onChange={(key) => void setThemeMode(key as ThemeMode)}
        />
      </SectionCard>

      <SectionCard
        icon="reminder"
        title="Daily reminder"
        subtitle="We'll nudge you to log the day's spending."
        right={<Pill label={settings.reminderTime} />}
      >
        <TimeField
          testID="settings-reminder-time"
          value={reminderInput}
          onChange={setReminderInput}
          accessibilityLabel="Reminder time"
        />
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
        <Button testID="settings-reminder-save" label="Save reminder" onPress={saveReminder} />
      </SectionCard>

      <SectionCard
        icon="notifications"
        title="Notifications"
        subtitle="Daily reminders and budget alerts."
        right={
          <Switch
            testID="settings-notifications-switch"
            value={settings.notificationsEnabled}
            onValueChange={toggleNotifications}
          />
        }
      />

      <CloudAccountCard />
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    padding: 16,
  },
  suggestion: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  error: {
    color: c.DANGER,
  },
});
