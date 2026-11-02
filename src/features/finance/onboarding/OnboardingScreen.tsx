import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { KeyboardAvoider } from '@/components/KeyboardAvoider';
import { LanguageToggle } from '@/components/LanguageToggle';
import { TimeField } from '@/components/TimeField';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import type { AppLanguage } from '@/i18n/resolveLanguage';
import { track } from '@/services/analytics';
import { useTheme, useThemeMode, useThemedStyles, type ThemeColors } from '@/theme';

import { OnboardingConsent } from './OnboardingConsent';
import { OnboardingIntro } from './OnboardingIntro';

/** How the first-entry step ended: only the first two make the day count. */
export type FirstEntryOutcome = 'logged' | 'noSpend' | 'later';

export interface OnboardingScreenProps {
  /** Called when the set-up is finished or skipped. */
  onDone: () => void;
  /**
   * Saves the daily reminder time and asks for notification permission,
   * resolving to whether reminders are on. Injected by the routing layer from
   * the auth feature.
   */
  onReminder: (time: string) => Promise<boolean>;
  /**
   * Renders the wallets step, which calls `next` once its own balances are
   * saved and shows `notice` above its buttons. Injected by the routing layer
   * from the accounts feature.
   */
  renderWallets: (next: () => void, notice: React.ReactNode) => React.ReactNode;
  /**
   * Renders the first-entry step, which calls `done` with how it ended.
   * Injected by the routing layer from the expenses feature.
   */
  renderFirstEntry: (done: (outcome: FirstEntryOutcome) => void) => React.ReactNode;
  /** The language the set-up is shown in. */
  language: AppLanguage;
  /**
   * Saves and applies a language picked in the header (VS-86). The step and
   * whatever was entered stay as they are. Injected by the routing layer.
   */
  onLanguage: (language: AppLanguage) => Promise<unknown>;
}

type Step = 'intro' | 'wallets' | 'first_entry' | 'reminder';
const STEPS: ReadonlyArray<Step> = ['intro', 'wallets', 'first_entry', 'reminder'];
/** The reminder closes the last numbered step rather than adding a fourth. */
const NUMBERED_STEPS = 3;

/** When the daily reminder is set if the user keeps the suggestion. */
const DEFAULT_REMINDER = '21:00';

/**
 * First-run set-up, from the problem to an action (VS-92):
 *
 * 1. The problem: you know what you earn, not where it goes.
 * 2. What the wallets hold today, with where the data stays and the optional
 *    analytics switch beneath the fields.
 * 3. A first expense, or a no-spend day, so the user leaves with a logged day.
 *    Its success state offers a reminder, sent only on days with nothing logged
 *    (VS-88). If the phone refuses notifications, it says so and waits, rather
 *    than finishing as if reminders were on. Left for later, the same offer
 *    appears without claiming that anything was noted.
 *
 * "Skip" leaves from any numbered step. The wallets, the first entry and the
 * reminder come from other features through the routing layer, so this slice
 * imports none of them. The header's FR | EN switch changes the language in
 * place (VS-86).
 */
export function OnboardingScreen({
  onDone,
  onReminder,
  renderWallets,
  renderFirstEntry,
  language,
  onLanguage,
}: OnboardingScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('onboarding');
  const { scheme } = useThemeMode();
  const [index, setIndex] = useState(0);
  const [noted, setNoted] = useState(false);
  const [time, setTime] = useState(DEFAULT_REMINDER);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const step = STEPS[index];
  const isReminder = step === 'reminder';
  // Step events reach analytics only once the user has opted in on the wallets step (VS-90).
  const next = () => {
    track('onboarding_step_completed', { workflow_step: step });
    setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const finish = (reminder: 'on' | 'blocked' | 'later') => {
    track('onboarding_step_completed', { workflow_step: 'reminder' });
    track('onboarding_completed', { reminder });
    onDone();
  };
  const skip = () => {
    track('onboarding_skipped', { workflow_step: step });
    onDone();
  };

  const remind = async () => {
    setSaving(true);
    let on = true;
    try {
      on = await onReminder(time);
    } catch (e) {
      // A failed save must not trap the user here; the reminder can be set
      // later in Preferences.
      console.error('Set-up reminder failed:', e);
    } finally {
      setSaving(false);
    }
    // Refused notifications: say so before leaving, so nobody believes a
    // reminder is coming (VS-88).
    if (!on) {
      setBlocked(true);
      return;
    }
    finish('on');
  };

  const changeLanguage = async (language: AppLanguage) => {
    try {
      await onLanguage(language);
    } catch (e) {
      // The set-up stays usable in the current language.
      console.error('Language switch failed:', e);
    }
  };

  const titleKey = {
    intro: 'intro.title',
    wallets: 'wallets.title',
    first_entry: 'firstEntry.title',
    reminder: noted ? 'reminder.notedTitle' : 'reminder.title',
  } as const;
  const bodyKey = {
    intro: 'intro.body',
    wallets: 'wallets.body',
    first_entry: 'firstEntry.body',
    reminder: 'reminder.body',
  } as const;
  const centered = step === 'intro' || isReminder;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="onboarding-screen">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <LanguageToggle
          testID="onboarding-language"
          value={language}
          onChange={(picked) => void changeLanguage(picked)}
        />
        {isReminder ? null : (
          <Pressable
            testID="onboarding-skip"
            accessibilityRole="button"
            accessibilityLabel={t('skipLabel')}
            onPress={skip}
            hitSlop={12}
          >
            <Typography style={styles.skip}>{t('skip')}</Typography>
          </Pressable>
        )}
      </View>

      <KeyboardAvoider>
        <ScrollView
          contentContainerStyle={[styles.body, centered && styles.bodyCentered]}
          keyboardShouldPersistTaps="handled"
        >
          {isReminder ? null : (
            <Typography variant="muted">{t('stepOf', { number: index + 1, total: NUMBERED_STEPS })}</Typography>
          )}
          {isReminder && noted ? (
            <View testID="onboarding-success" style={styles.success}>
              <Icon name="check" size={ICON_SIZE.lg} color={c.PRIMARY_TEXT} />
            </View>
          ) : null}
          <Typography variant="display">{t(titleKey[step])}</Typography>
          <Typography style={styles.text}>{t(bodyKey[step])}</Typography>

          {step === 'intro' ? <OnboardingIntro /> : null}

          {step === 'wallets'
            ? renderWallets(
                next,
                <View style={styles.notice}>
                  <Typography variant="muted" style={styles.small}>
                    {t('wallets.privacy')}
                  </Typography>
                  <OnboardingConsent />
                </View>,
              )
            : null}

          {step === 'first_entry'
            ? renderFirstEntry((outcome) => {
                setNoted(outcome !== 'later');
                next();
              })
            : null}

          {isReminder && blocked ? (
            <Typography testID="onboarding-reminder-blocked" style={styles.blocked}>
              {t('reminder.blocked')}
            </Typography>
          ) : null}
          {isReminder && !blocked ? (
            <TimeField
              testID="onboarding-reminder-time"
              value={time}
              onChange={setTime}
              accessibilityLabel={t('reminder.time')}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoider>

      <View style={styles.footer}>
        {step === 'intro' ? (
          <Button testID="onboarding-next" label={t('intro.start')} onPress={next} />
        ) : null}
        {isReminder && blocked ? (
          <Button testID="onboarding-continue" label={t('reminder.continue')} onPress={() => finish('blocked')} />
        ) : null}
        {isReminder && !blocked ? (
          <>
            <Button
              testID="onboarding-remind"
              label={t('reminder.enable')}
              onPress={() => void remind()}
              loading={saving}
            />
            <Button
              testID="onboarding-later"
              label={t('reminder.later')}
              variant="ghost"
              onPress={() => finish('later')}
            />
          </>
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
      paddingBottom: SPACING.lg,
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
      gap: SPACING.lg,
      paddingVertical: SPACING.xl,
    },
    bodyCentered: {
      justifyContent: 'center',
    },
    text: {
      color: c.TEXT_SECONDARY,
      lineHeight: 22,
    },
    success: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.PRIMARY_LIGHT,
    },
    notice: {
      gap: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.BORDER,
    },
    small: {
      fontSize: 13,
      lineHeight: 19,
    },
    blocked: {
      color: c.WARNING_TEXT,
      lineHeight: 22,
    },
    footer: {
      gap: SPACING.sm,
    },
  });
