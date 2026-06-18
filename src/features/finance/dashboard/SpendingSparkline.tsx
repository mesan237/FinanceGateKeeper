import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BORDER_STRONG, PRIMARY_GREEN } from '@/constants/colors';
import { RADIUS } from '@/constants/layout';

const BAR_MAX_HEIGHT = 28;
const BAR_MIN_HEIGHT = 3;

export interface SpendingSparklineProps {
  /** Per-day spending totals, oldest first; the last entry is today. */
  values: number[];
  testID?: string;
}

/**
 * Minimal spending trend: one bar per day scaled against the busiest day,
 * with today (the last bar) highlighted in green. Renders nothing when every
 * value is zero — an empty chart is noise, not information.
 */
export function SpendingSparkline({ values, testID }: SpendingSparklineProps) {
  const max = Math.max(0, ...values);
  if (values.length === 0 || max === 0) return null;

  return (
    <View style={styles.row} testID={testID}>
      {values.map((value, i) => (
        <View key={i} style={styles.slot}>
          <View
            testID={testID ? `${testID}-bar-${i}` : undefined}
            style={[
              styles.bar,
              { height: Math.max(BAR_MIN_HEIGHT, Math.round((value / max) * BAR_MAX_HEIGHT)) },
              i === values.length - 1 && styles.barToday,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_HEIGHT,
    gap: 6,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 6,
    borderRadius: RADIUS.full,
    backgroundColor: BORDER_STRONG,
  },
  barToday: {
    backgroundColor: PRIMARY_GREEN,
  },
});
