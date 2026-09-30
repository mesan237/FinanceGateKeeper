import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { useThemeMode, useThemedStyles, type ThemeColors } from '@/theme';

export interface OnboardingScreenProps {
  /** Called when the user finishes the last panel or skips. */
  onDone: () => void;
}

interface Panel {
  /** Catalogue key under `onboarding.panels`. */
  key: 'track' | 'budget' | 'reports' | 'done';
  /** Optional chip row (used to preview what the app tracks). */
  chips?: ReadonlyArray<'expenses' | 'income' | 'budgets' | 'debts'>;
}

// The intro panels; their copy lives in the `onboarding` catalogue.
const PANELS: ReadonlyArray<Panel> = [
  { key: 'track', chips: ['expenses', 'income', 'budgets', 'debts'] },
  { key: 'budget' },
  { key: 'reports' },
  { key: 'done' },
];

/**
 * First-run onboarding carousel (VS-23). Presentational only — it walks through a
 * few intro panels and calls `onDone` when the user finishes the last one or taps
 * Skip. The routing layer owns whether it is shown and persisting completion, so
 * this component never touches the auth feature or the database.
 */
export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('onboarding');
  const { scheme } = useThemeMode();
  const [index, setIndex] = useState(0);

  const panel = PANELS[index];
  const isLast = index === PANELS.length - 1;

  const next = () => {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} testID="onboarding-screen">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        {isLast ? null : (
          <Pressable
            testID="onboarding-skip"
            accessibilityRole="button"
            accessibilityLabel={t('skipLabel')}
            onPress={onDone}
            hitSlop={12}
          >
            <Typography variant="muted" style={styles.skip}>
              {t('skip')}
            </Typography>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <Typography variant="display" style={styles.title}>
          {t(`panels.${panel.key}.title`)}
        </Typography>
        <Typography variant="body" style={styles.text}>
          {t(`panels.${panel.key}.body`)}
        </Typography>

        {panel.chips ? (
          <View style={styles.chips}>
            {panel.chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Typography variant="label" style={styles.chipText}>
                  {t(`chips.${chip}`)}
                </Typography>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PANELS.map((p, i) => (
            <View
              key={p.key}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </View>
        <Button
          testID="onboarding-next"
          label={isLast ? t('getStarted') : t('next')}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.BACKGROUND,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    header: {
      minHeight: 32,
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingTop: 8,
    },
    skip: {
      color: c.PRIMARY_GREEN,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      gap: 16,
    },
    title: {
      textAlign: 'center',
    },
    text: {
      textAlign: 'center',
      color: c.TEXT_MUTED,
      lineHeight: 22,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    chip: {
      backgroundColor: c.PRIMARY_LIGHT,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: {
      color: c.PRIMARY_GREEN,
    },
    footer: {
      gap: 20,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.BORDER,
    },
    dotActive: {
      backgroundColor: c.PRIMARY_GREEN,
      width: 20,
    },
  });
