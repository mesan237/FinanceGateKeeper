import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { TimeField } from '@/components/TimeField';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import type { AppLanguage } from '@/i18n/resolveLanguage';
import { useThemeMode, useThemedStyles, type ThemeColors } from '@/theme';

import { OnboardingIntro } from './OnboardingIntro';

export interface OnboardingScreenProps {
  /** Called when the set-up is finished or skipped. */
  onDone: () => void;
  /**
   * Saves the daily reminder time and asks for notification permission.
   * Injected by the routing layer from the auth feature.
   */
  onReminder: (time: string) => Promise<unknown>;
  /**
   * Renders the wallets step, which calls `next` once its own balances are
   * saved. Injected by the routing layer from the accounts feature.
   */
  renderWallets: (next: () => void) => React.ReactNode;
  /** The language the set-up is shown in. */
  language: AppLanguage;
  /**
   * Saves and applies a language picked in the header (VS-86). The step and
   * whatever was entered stay as they are. Injected by the routing layer.
   */
  onLanguage: (language: AppLanguage) => Promise<unknown>;
}

type Step = 'intro' | 'wallets' | 'reminder';
const STEPS: ReadonlyArray<Step> = ['intro', 'wallets', 'reminder'];

/** When the daily reminder is set if the user keeps the suggestion. */
const DEFAULT_REMINDER = '21:00';

/**
 * First-run set-up (UX-08), replacing the four-card tutorial (NN/g found such
 * decks add no success and make tasks feel harder). Three short steps, each
 * doing something rather than explaining it:
 *
 * 1. What the app does: a budget built on real spending, in three stages —
 *    observe now, plan after three complete months, then optimize (VS-87).
 * 2. What the wallets hold today, so balances are right from day one. Where the
 *    data stays is said before any amount is asked for.
 * 3. When to remind the user to log.
 *
 * Steps 2 and 3 can wait ("Not now" / "No reminders"), and "Skip set-up" leaves
 * from anywhere. The wallets step and the reminder come from other features
 * through the routing layer, so this slice imports none of them. The header's
 * FR | EN switch changes the language in place (VS-86).
 */
export function OnboardingScreen({
  onDone,
  onReminder,
  renderWallets,
  language,
  onLanguage,
}: OnboardingScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('onboarding');
  const { scheme } = useThemeMode();
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(DEFAULT_REMINDER);
  const [saving, setSaving] = useState(false);

  const step = STEPS[index];
  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const remind = async () => {
    setSaving(true);
    try {
      await onReminder(time);
    } catch (e) {
      // A refused permission or a failed save must not trap the user here;
      // the reminder can be set later in Preferences.
      console.error('Set-up reminder failed:', e);
    } finally {
      setSaving(false);
      onDone();
    }
  };

  const changeLanguage = async (next: AppLanguage) => {
    try {
      await onLanguage(next);
    } catch (e) {
      // The set-up stays usable in the current language.
      console.error('Language switch failed:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="onboarding-screen">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <LanguageToggle
          testID="onboarding-language"
          value={language}
          onChange={(next) => void changeLanguage(next)}
        />
        <Pressable
          testID="onboarding-skip"
          accessibilityRole="button"
          accessibilityLabel={t('skipLabel')}
          onPress={onDone}
          hitSlop={12}
        >
          <Typography style={styles.skip}>{t('skip')}</Typography>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Typography variant="muted">{t('stepOf', { number: index + 1, total: STEPS.length })}</Typography>
        <Typography variant="display">{t(`${step}.title`)}</Typography>
        <Typography style={styles.text}>{t(`${step}.body`)}</Typography>

        {step === 'intro' ? <OnboardingIntro /> : null}

        {step === 'wallets' ? (
          <>
            <Typography variant="muted" style={styles.privacy}>
              {t('wallets.privacy')}
            </Typography>
            {renderWallets(next)}
          </>
        ) : null}

        {step === 'reminder' ? (
          <TimeField
            testID="onboarding-reminder-time"
            value={time}
            onChange={setTime}
            accessibilityLabel={t('reminder.time')}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step === 'intro' ? (
          <Button testID="onboarding-next" label={t('intro.start')} onPress={next} />
        ) : null}
        {step === 'reminder' ? (
          <Button
            testID="onboarding-remind"
            label={t('reminder.enable')}
            onPress={() => void remind()}
            loading={saving}
          />
        ) : null}
        {step === 'reminder' ? (
          <Button testID="onboarding-later" label={t('reminder.later')} variant="ghost" onPress={onDone} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.BACKGROUND,
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xl,
    },
    header: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: SPACING.sm,
    },
    skip: {
      color: c.PRIMARY_TEXT,
    },
    body: {
      flexGrow: 1,
      justifyContent: 'center',
      gap: SPACING.lg,
      paddingVertical: SPACING.xl,
    },
    text: {
      color: c.TEXT_SECONDARY,
      lineHeight: 22,
    },
    privacy: {
      fontSize: 13,
      lineHeight: 19,
    },
    footer: {
      gap: SPACING.sm,
    },
  });
