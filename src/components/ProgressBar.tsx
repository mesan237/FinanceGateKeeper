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
  /**
   * Draws a reference tick at this 0–100 position — "where the fill *should* be
   * by now". A budget bar without one answers "how much have I used?"; with one
   * it answers the question that actually drives a decision: "am I ahead or
   * behind?". Omit for bars that track progress toward a goal rather than pace.
   */
  marker?: number;
  /** Tick colour. Defaults to the theme's strong border. */
  markerColor?: string;
}

export function ProgressBar({
  value,
  color,
  trackColor,
  animated = false,
  marker,
  markerColor,
  testID,
  style,
  ...rest
}: ProgressBarProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const fillColor = color ?? c.PRIMARY_GREEN;
  const trackStyle = trackColor ? { backgroundColor: trackColor } : undefined;
  const clamped = clamp(value);

  const tick =
    marker == null ? null : (
      <View
        testID={testID ? `${testID}-marker` : undefined}
        accessibilityValue={{ now: clamp(marker), min: 0, max: 100 }}
        pointerEvents="none"
        style={[
          styles.marker,
          { left: `${clamp(marker)}%`, backgroundColor: markerColor ?? c.BORDER_STRONG },
        ]}
      />
    );

  if (animated) {
    return (
      <AnimatedFill
        clamped={clamped}
        color={fillColor}
        testID={testID}
        style={[trackStyle, style]}
        {...rest}
      >
        {tick}
      </AnimatedFill>
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
      {tick}
    </View>
  );
}

/** Constrains a raw percentage to the drawable 0–100 range. */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

interface AnimatedFillProps extends ViewProps {
  clamped: number;
  color: string;
}

/** Track + fill whose width eases from empty to `clamped` whenever the target moves. */
function AnimatedFill({ clamped, color, testID, style, children, ...rest }: AnimatedFillProps) {
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
      {children}
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
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    // Centres the 2px tick on its percentage rather than starting at it.
    marginLeft: -1,
    borderRadius: RADIUS.full,
  },
});
