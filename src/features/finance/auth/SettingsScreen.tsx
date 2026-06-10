import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { BORDER, DANGER, PRIMARY_GREEN, TEXT_MUTED } from '@/constants/colors';

import { useAppModeContext } from './AppModeProvider';
import { useActionBarStyle, useAppSettings } from './auth.hooks';
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
  const { style: actionBarStyle, setStyle: setActionBarStyle } = useActionBarStyle();

  const [reminderInput, setReminderInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Seed the editable reminder field once settings load.
  useEffect(() => {
    if (settings) setReminderInput(settings.reminderTime);
  }, [settings]);

  if (!settings) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Loading settings…</Typography>
      </View>
    );
  }

  const toggleMode = async () => {
    await setMode(settings.appMode === 'control' ? 'learning' : 'control');
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

      <View style={styles.section}>
        <Typography variant="subheading">App mode</Typography>
        <Typography variant="muted">
          {settings.appMode === 'control'
            ? 'Control mode — full budgeting features.'
            : 'Learning mode — logging only. Budgeting is hidden.'}
        </Typography>
        {monthOneComplete && settings.appMode === 'learning' ? (
          <Typography testID="settings-control-suggestion" style={styles.suggestion}>
            You&apos;ve used the app for a month — switch to Control mode?
          </Typography>
        ) : null}
        <Button
          testID="settings-mode-toggle"
          label={settings.appMode === 'control' ? 'Switch to Learning mode' : 'Switch to Control mode'}
          onPress={toggleMode}
        />
      </View>

      <View style={styles.section}>
        <Typography variant="subheading">Daily reminder</Typography>
        <TextInput
          testID="settings-reminder-input"
          value={reminderInput}
          onChangeText={setReminderInput}
          placeholder="HH:mm (e.g. 21:00)"
          accessibilityLabel="Reminder time"
        />
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
        <Button testID="settings-reminder-save" label="Save reminder" onPress={saveReminder} />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Typography variant="subheading">Notifications</Typography>
          <Switch
            testID="settings-notifications-switch"
            value={settings.notificationsEnabled}
            onValueChange={toggleNotifications}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Typography variant="subheading">Action bar style</Typography>
        <Typography variant="muted">
          Controls how the Transactions tab action bar appears.
        </Typography>
        {(['explicit', 'speed_dial'] as const).map((option) => (
          <Pressable
            key={option}
            testID={`settings-action-bar-${option}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: actionBarStyle === option }}
            style={[styles.optionRow, actionBarStyle === option && styles.optionRowActive]}
            onPress={() => void setActionBarStyle(option)}
          >
            <Typography style={actionBarStyle === option ? styles.optionTextActive : undefined}>
              {option === 'explicit' ? 'Explicit buttons' : 'Speed dial'}
            </Typography>
            {actionBarStyle === option ? (
              <Typography style={styles.checkmark}>✓</Typography>
            ) : null}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestion: {
    color: PRIMARY_GREEN,
    fontWeight: '600',
  },
  error: {
    color: DANGER,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  optionRowActive: {
    borderColor: PRIMARY_GREEN,
    backgroundColor: '#E8F5E9',
  },
  optionTextActive: {
    color: PRIMARY_GREEN,
    fontWeight: '600',
  },
  checkmark: {
    color: PRIMARY_GREEN,
    fontWeight: '700',
  },
});
