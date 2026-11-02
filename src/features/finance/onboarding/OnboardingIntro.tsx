import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { RADIUS, SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** The example month's parts, by share: what the user knows, then the gap. */
const PARTS = [
  { key: 'rent', share: 31, color: 'KIND_ROUTINE' },
  { key: 'food', share: 24, color: 'KIND_EVERYDAY' },
  { key: 'transport', share: 14, color: 'KIND_EVENT' },
] as const;
const UNNOTED_SHARE = 31;

/**
 * The first set-up screen's illustration (VS-92): an example month, clearly
 * labelled as one, whose dashed end stands for the money nobody noted. It holds
 * no real figures, because nothing has been logged yet.
 */
export function OnboardingIntro() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('onboarding');

  return (
    <View style={styles.container} testID="onboarding-example">
      <Typography variant="muted" style={styles.label}>
        {t('intro.example')}
      </Typography>
      <View style={styles.bar}>
        {PARTS.map((part) => (
          <View key={part.key} style={[styles.part, styles[part.color], { flex: part.share }]} />
        ))}
        <View style={[styles.part, styles.unnoted, { flex: UNNOTED_SHARE }]} />
      </View>
      <View style={styles.legend}>
        {PARTS.map((part) => (
          <View key={part.key} style={styles.legendItem}>
            <View style={[styles.square, styles[part.color]]} />
            <Typography variant="muted" style={styles.legendText}>
              {t(`intro.legend.${part.key}`)}
            </Typography>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.square, styles.unnoted]} />
          <Typography variant="muted" style={styles.legendText}>
            {t('intro.legend.unnoted')}
          </Typography>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { gap: SPACING.sm },
    label: { fontSize: 12, letterSpacing: 0.5 },
    bar: { flexDirection: 'row', height: 24, gap: 2, borderRadius: RADIUS.sm, overflow: 'hidden' },
    part: { height: '100%' },
    unnoted: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.TEXT_MUTED,
      borderRadius: RADIUS.sm,
    },
    KIND_ROUTINE: { backgroundColor: c.KIND_ROUTINE },
    KIND_EVERYDAY: { backgroundColor: c.KIND_EVERYDAY },
    KIND_EVENT: { backgroundColor: c.KIND_EVENT },
    legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.md, rowGap: SPACING.xs },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
    square: { width: 8, height: 8 },
    legendText: { fontSize: 12 },
  });
