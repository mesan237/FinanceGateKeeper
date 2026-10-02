import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TimeField } from '@/components/TimeField';
import { Toggle } from '@/components/Toggle';
import { Typography } from '@/components/Typography';
import { KeyboardAvoider } from '@/components/KeyboardAvoider';
import { FONT_FAMILY } from '@/constants/fonts';
import { isAppLanguage } from '@/i18n/resolveLanguage';
import { useTheme, useThemeMode, useThemedStyles, type ThemeColors, type ThemeMode } from '@/theme';

import { useAppSettings } from './auth.hooks';
import { applyReminderSchedule } from './reminder';

/**
 * App settings: appearance, language, the daily reminder time and the
 * notifications toggle. Reminder, notification and language changes reconcile
 * the scheduled notification via `applyReminderSchedule` (shared notifications
 * infra) — a language change re-schedules it so its text follows the UI.
 */
export function SettingsScreen() {
  const { settings, setReminderTime, setNotificationsEnabled, setLanguage } = useAppSettings();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { t } = useTranslation(['auth', 'common']);
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
        <Typography variant="muted">{t('settings.loading')}</Typography>
      </View>
    );
  }

  const changeLanguage = async (key: string) => {
    await setLanguage(isAppLanguage(key) ? key : null);
    await applyReminderSchedule({
      reminderTime: settings.reminderTime,
      notificationsEnabled: settings.notificationsEnabled,
    });
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
      // The picker only yields a valid HH:mm, so this surfaces genuine save
      // failures — not a format error.
      setError(e instanceof Error ? e.message : t('settings.reminderSaveError'));
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    await setNotificationsEnabled(enabled);
    await applyReminderSchedule({ reminderTime: settings.reminderTime, notificationsEnabled: enabled });
  };

  return (
    <KeyboardAvoider>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title={t('settings.title')} />

        <Pressable
          testID="settings-profile-link"
          accessibilityRole="button"
          onPress={() => router.push('/profile')}
        >
          <SectionCard
            icon="profile"
            title={t('settings.profileTitle')}
            subtitle={t('settings.profileSubtitle')}
            right={<Icon name="forward" color={c.TEXT_MUTED} />}
          />
        </Pressable>

        <SectionCard
          icon="appearance"
          title={t('settings.appearanceTitle')}
          subtitle={t('settings.appearanceSubtitle')}
        >
          <SegmentedControl
            testID="settings-theme-control"
            value={themeMode}
            segments={[
              { key: 'system', label: t('settings.themeSystem') },
              { key: 'light', label: t('settings.themeLight') },
              { key: 'dark', label: t('settings.themeDark') },
            ]}
            onChange={(key) => void setThemeMode(key as ThemeMode)}
          />
        </SectionCard>

        <SectionCard
          icon="language"
          title={t('settings.languageTitle')}
          subtitle={t('settings.languageSubtitle')}
        >
          <SegmentedControl
            testID="settings-language-control"
            value={settings.language ?? 'system'}
            segments={[
              { key: 'system', label: t('settings.languageSystem') },
              { key: 'fr', label: t('common:languages.fr') },
              { key: 'en', label: t('common:languages.en') },
            ]}
            onChange={(key) => void changeLanguage(key)}
          />
        </SectionCard>

        <SectionCard
          icon="reminder"
          title={t('settings.reminderTitle')}
          subtitle={t('settings.reminderSubtitle')}
          right={<Pill label={settings.reminderTime} />}
        >
          <TimeField
            testID="settings-reminder-time"
            value={reminderInput}
            onChange={setReminderInput}
            accessibilityLabel={t('settings.reminderTimeLabel')}
          />
          {error ? <Typography style={styles.error}>{error}</Typography> : null}
          <Button
            testID="settings-reminder-save"
            label={t('settings.reminderSave')}
            onPress={saveReminder}
          />
        </SectionCard>

        <SectionCard
          icon="notifications"
          title={t('settings.notificationsTitle')}
          subtitle={t('settings.notificationsSubtitle')}
          right={
            <Toggle
              testID="settings-notifications-switch"
              value={settings.notificationsEnabled}
              onValueChange={toggleNotifications}
              accessibilityLabel={t('settings.notificationsTitle')}
            />
          }
        />
      </ScrollView>
    </KeyboardAvoider>
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
