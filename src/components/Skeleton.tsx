import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { RADIUS, SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

/** One full dim-and-back cycle. Slow enough to read as "loading", not as a flash. */
const PULSE_DURATION_MS = 800;

const MIN_OPACITY = 0.4;
const MAX_OPACITY = 1;

export interface SkeletonProps extends ViewProps {
  /** Block width — a number of px or a percentage string. Defaults to full width. */
  width?: DimensionValue;
  /** Block height in px. Defaults to a text-line height. */
  height?: number;
  /** Corner radius token override — `full` for avatar/pill placeholders. */
  radius?: number;
}

/**
 * A single pulsing placeholder block.
 *
 * Skeletons are used instead of a spinner wherever the shape of the incoming
 * content is known, so the layout does not jump when data lands — the page
 * settles into the outline it was already showing.
 */
export function Skeleton({ width = '100%', height = 14, radius, style, ...rest }: SkeletonProps) {
  const styles = useThemedStyles(makeStyles);
  const opacity = useSharedValue(MAX_OPACITY);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(MIN_OPACITY, { duration: PULSE_DURATION_MS }),
      -1,
      true,
    );
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.block, { width, height, borderRadius: radius ?? RADIUS.sm }, pulse, style]}
      {...rest}
    />
  );
}

export interface SkeletonRowsProps {
  /** How many placeholder rows to draw. */
  count?: number;
  testID?: string;
}

/**
 * A stack of list-row skeletons — a leading circle, two stacked text lines, and
 * a trailing amount. Matches the shape of the app's icon/label/amount rows.
 */
export function SkeletonRows({ count = 3, testID }: SkeletonRowsProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.rows} testID={testID}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={32} height={32} radius={RADIUS.full} />
          <View style={styles.rowBody}>
            <Skeleton width="55%" height={13} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={64} height={16} />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  block: {
    backgroundColor: c.SURFACE_MUTED,
  },
  rows: {
    gap: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowBody: {
    flex: 1,
    gap: SPACING.sm,
  },
});
