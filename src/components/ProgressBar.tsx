import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BORDER, PRIMARY_GREEN } from '@/constants/colors';
import { RADIUS } from '@/constants/layout';

const FILL_DURATION_MS = 600;

export interface ProgressBarProps extends ViewProps {
  value: number;
  /** Fill color — defaults to PRIMARY_GREEN. Pass DANGER/WARNING/SUCCESS for semantic states. */
  color?: string;
  /** When true, the fill grows from empty to `value` on mount/changes. Default false. */
  animated?: boolean;
}

export function ProgressBar({
  value,
  color = PRIMARY_GREEN,
  animated = false,
  testID,
  style,
  ...rest
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  if (animated) {
    return (
      <AnimatedFill
        clamped={clamped}
        color={color}
        testID={testID}
        style={style}
        {...rest}
      />
    );
  }

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
        style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]}
      />
    </View>
  );
}

interface AnimatedFillProps extends ViewProps {
  clamped: number;
  color: string;
}

/** Track + fill whose width eases from empty to `clamped` whenever the target moves. */
function AnimatedFill({ clamped, color, testID, style, ...rest }: AnimatedFillProps) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(clamped, { duration: FILL_DURATION_MS });
  }, [clamped, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      testID={testID}
      style={[styles.track, style]}
      {...rest}
    >
      <Animated.View
        testID={testID ? `${testID}-fill` : undefined}
        accessibilityValue={{ now: clamped, min: 0, max: 100 }}
        style={[styles.fill, { backgroundColor: color }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: BORDER,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
