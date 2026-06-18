import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { useThemeMode, useThemedStyles, type ThemeColors, type ThemeMode } from '@/theme';
import { useCloudSync } from '@/hooks/useCloudSync';
import { formatDateLong } from '@/utils/formatDate';

import { useAppModeContext } from './AppModeProvider';
import { useAppSettings } from './auth.hooks';
import { applyReminderSchedule } from './reminder';

/**
 * App settings: switch between learning and control mode, set the daily
 * reminder time, and toggle notifications. Reminder/notification changes
 * reconcile the scheduled notification via `applyReminderSchedule` (shared
 * notifications infra). After a mode change it refreshes the app-mode context
 * so the tab bar updates immediately.
 */
export function SettingsScreen() {
  const {
    settings,
    monthOneComplete,
    setMode,
    setReminderTime,
    setNotificationsEnabled,
  } = useAppSettings();
  const { refresh: refreshMode } = useAppModeContext();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const cloud = useCloudSync();
  const styles = useThemedStyles(makeStyles);

  const [reminderInput, setReminderInput] = useState('');
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
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

  const isControl = settings.appMode === 'control';

  const toggleMode = async () => {
    await setMode(isControl ? 'learning' : 'control');
    await refreshMode();
  };

  const saveReminder = async () => {
    try {
      await setReminderTime(reminderInput);
      await applyReminderSchedule({
        reminderTime: reminderInput,
        notificationsEnabled: settings.notificationsEnabled,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid time. Use HH:mm.');
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    await setNotificationsEnabled(enabled);
    await applyReminderSchedule({ reminderTime: settings.reminderTime, notificationsEnabled: enabled });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Settings" />

      <SectionCard
        icon="appMode"
        title="App mode"
        subtitle={
          isControl
            ? 'Control mode — full budgeting features.'
            : 'Learning mode — logging only. Budgeting is hidden.'
        }
        right={<Pill label={isControl ? 'Control' : 'Learning'} />}
      >
        {monthOneComplete && !isControl ? (
          <Typography testID="settings-control-suggestion" style={styles.suggestion}>
            You&apos;ve used the app for a month — switch to Control mode?
          </Typography>
        ) : null}
        <Button
          testID="settings-mode-toggle"
          label={isControl ? 'Switch to Learning mode' : 'Switch to Control mode'}
          variant="secondary"
          onPress={toggleMode}
        />
      </SectionCard>

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
        <TextInput
          testID="settings-reminder-input"
          value={reminderInput}
          onChangeText={setReminderInput}
          placeholder="HH:mm (e.g. 21:00)"
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

      <SectionCard
        icon="cloud"
        title="Cloud backup"
        subtitle={
          cloud.signedIn
            ? undefined
            : 'Back up your data to the cloud and restore it on a new device.'
        }
      >
        {cloud.signedIn ? (
          <>
            <View style={styles.accountRow}>
              <View style={styles.accountText}>
                <Typography variant="muted">Signed in as</Typography>
                <Typography>{cloud.userEmail ?? 'your account'}</Typography>
              </View>
              {cloud.lastSyncedAt ? (
                <Typography testID="settings-last-synced" variant="muted" style={styles.syncStamp}>
                  Synced {formatDateLong(cloud.lastSyncedAt)}
                </Typography>
              ) : (
                <Typography variant="muted">Not synced yet.</Typography>
              )}
            </View>
            {cloud.status === 'error' && cloud.error ? (
              <Typography style={styles.error}>{cloud.error}</Typography>
            ) : null}
            <Button
              testID="settings-sync-now"
              label={cloud.status === 'syncing' ? 'Syncing…' : 'Sync now'}
              onPress={() => void cloud.syncNow()}
              disabled={cloud.status === 'syncing'}
            />
            <Button testID="settings-sign-out" label="Sign out" variant="secondary" compact onPress={() => void cloud.signOut()} />
          </>
        ) : (
          <>
            <TextInput
              testID="settings-cloud-email"
              value={cloudEmail}
              onChangeText={setCloudEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Cloud account email"
            />
            <TextInput
              testID="settings-cloud-password"
              value={cloudPassword}
              onChangeText={setCloudPassword}
              placeholder="Password"
              secureTextEntry
              accessibilityLabel="Cloud account password"
            />
            {cloud.error ? <Typography style={styles.error}>{cloud.error}</Typography> : null}
            <Button
              testID="settings-sign-in"
              label="Sign in"
              onPress={() => void cloud.signIn(cloudEmail, cloudPassword)}
            />
            <Button
              testID="settings-sign-up"
              label="Create account"
              variant="secondary"
              compact
              onPress={() => void cloud.signUp(cloudEmail, cloudPassword)}
            />
          </>
        )}
      </SectionCard>
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
  accountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountText: {
    gap: 2,
    flexShrink: 1,
  },
  syncStamp: {
    textAlign: 'right',
    flexShrink: 1,
  },
  suggestion: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  error: {
    color: c.DANGER,
  },
});
