import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { formatCurrency } from '@/utils/formatCurrency';

import type { FundProgress } from './funds.types';

function progressColor(pct: number, c: ThemeColors): string {
  if (pct >= 75) return c.SUCCESS;
  if (pct >= 40) return c.WARNING;
  return c.DANGER;
}

export interface FundProgressBarProps {
  progress: FundProgress;
  /** Base testID; the underlying bar fill is exposed as `${testID}-fill`. */
  testID?: string;
}

/**
 * Renders a fund's progress toward its target: a `current / target` caption
 * plus a percentage and a bar. When the fund has no target (savings), it shows
 * the balance only — no bar, no percentage.
 */
export function FundProgressBar({ progress, testID }: FundProgressBarProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  if (progress.target === null || progress.pct === null) {
    return (
      <View style={styles.container}>
        <Typography>{formatCurrency(progress.current)}</Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Typography variant="muted">
          {`${formatCurrency(progress.current)} / ${formatCurrency(progress.target)}`}
        </Typography>
        <Typography variant="muted" style={styles.pct}>{`${progress.pct}%`}</Typography>
      </View>
      <ProgressBar value={progress.pct} color={progressColor(progress.pct, c)} testID={testID} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pct: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
