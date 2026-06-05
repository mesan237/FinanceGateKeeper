import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';

import type { FundProgress } from './funds.types';

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
        <Typography>{`${progress.pct}%`}</Typography>
      </View>
      <ProgressBar value={progress.pct} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
