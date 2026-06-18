import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

const FILL_DURATION_MS = 600;

export interface ProgressBarProps extends ViewProps {
  value: number;
  /** Fill color — defaults to the theme's PRIMARY_GREEN. Pass DANGER/WARNING/SUCCESS for semantic states. */
  color?: string;
  /** Track (unfilled) color — defaults to the theme's BORDER. Pass a semantic
   * color to read the fill as "spent over remaining" (e.g. a green track). */
  trackColor?: string;
  /** When true, the fill grows from empty to `value` on mount/changes. Default false. */
  animated?: boolean;
}

export function ProgressBar({
  value,
  color,
  trackColor,
  animated = false,
  testID,
  style,
  ...rest
}: ProgressBarProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const fillColor = color ?? c.PRIMARY_GREEN;
  const trackStyle = trackColor ? { backgroundColor: trackColor } : undefined;
  const clamped = Math.min(100, Math.max(0, value));

  if (animated) {
    return (
      <AnimatedFill
        clamped={clamped}
        color={fillColor}
        testID={testID}
        style={[trackStyle, style]}
        {...rest}
      />
    );
  }

  return (
    <View
      accessibilityRole="progressbar"
      testID={testID}
      style={[styles.track, trackStyle, style]}
      {...rest}
    >
      <View
        testID={testID ? `${testID}-fill` : undefined}
        accessibilityValue={{ now: clamped, min: 0, max: 100 }}
        style={[styles.fill, { width: `${clamped}%`, backgroundColor: fillColor }]}
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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: c.BORDER,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
