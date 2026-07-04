import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS } from '@/constants/allocation';
import { useThemeMode, useThemedStyles, type ThemeColors } from '@/theme';

export interface OnboardingScreenProps {
  /** Called when the user finishes the last panel or skips. */
  onDone: () => void;
}

interface Panel {
  title: string;
  body: string;
  /** Optional chip row (used to preview the allocation buckets). */
  chips?: string[];
}

const BUCKET_CHIPS = [
  BUCKET_LABELS.emergency_fund,
  BUCKET_LABELS.savings,
  BUCKET_LABELS.projects,
  BUCKET_LABELS.expenses,
];

// The intro panels. Copy is deliberately jargon-light — the terms it introduces
// (buckets, Learning/Control mode) are the ones the rest of the app assumes.
const PANELS: Panel[] = [
  {
    title: 'Track every franc',
    body: 'Log each income and expense as it happens. That daily habit is the whole game — every budget, fund, and goal builds on it.',
  },
  {
    title: 'Income splits itself',
    body: 'Every time you add income, Finance Gatekeeper divides it across four buckets automatically, so money is set aside before you can spend it.',
    chips: BUCKET_CHIPS,
  },
  {
    title: 'Start in Learning mode',
    body: "You'll begin with just logging — no budgets to set up. When you're ready for allocation and budget tracking, switch to Control mode in Settings.",
  },
  {
    title: "You're all set",
    body: 'Set a daily reminder any time in Settings so a day never slips by unlogged. Let’s get started.',
  },
];

/**
 * First-run onboarding carousel (VS-23). Presentational only — it walks through a
 * few intro panels and calls `onDone` when the user finishes the last one or taps
 * Skip. The routing layer owns whether it is shown and persisting completion, so
 * this component never touches the auth feature or the database.
 */
export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const styles = useThemedStyles(makeStyles);
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
            accessibilityLabel="Skip onboarding"
            onPress={onDone}
            hitSlop={12}
          >
            <Typography variant="muted" style={styles.skip}>
              Skip
            </Typography>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <Typography variant="display" style={styles.title}>
          {panel.title}
        </Typography>
        <Typography variant="body" style={styles.text}>
          {panel.body}
        </Typography>

        {panel.chips ? (
          <View style={styles.chips}>
            {panel.chips.map((label) => (
              <View key={label} style={styles.chip}>
                <Typography variant="label" style={styles.chipText}>
                  {label}
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
              key={p.title}
              style={[styles.dot, i === index ? styles.dotActive : null]}
            />
          ))}
        </View>
        <Button
          testID="onboarding-next"
          label={isLast ? 'Get started' : 'Next'}
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
