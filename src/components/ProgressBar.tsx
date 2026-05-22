import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { PRIMARY_GREEN } from '@/constants/colors';

export interface ProgressBarProps extends ViewProps {
  value: number;
}

export function ProgressBar({ value, testID, style, ...rest }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View
      accessibilityRole="progressbar"
      testID={testID}
      style={[styles.track, style]}
      {...rest}
    >
      <View
        testID={testID ? `${testID}-fill` : undefined}
        accessibilityValue={{ now: clamped, min: 0, max: 100 }}
        style={[styles.fill, { width: `${clamped}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: PRIMARY_GREEN,
  },
});
