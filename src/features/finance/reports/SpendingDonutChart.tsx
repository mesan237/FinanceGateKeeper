import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { groupDigits } from '@/utils/groupDigits';

import { colorForIndex } from './categoryColors';
import type { CategorySpend } from './reports.types';

const SIZE = 200;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;

export interface SpendingDonutChartProps {
  data: CategorySpend[];
  /** Outer diameter in dp. Defaults to 200. */
  size?: number;
}

/**
 * A donut breakdown of category spend, built directly on `react-native-svg`
 * (chart-kit can't render a centered total inside the hole). Each category is
 * one stroked arc, colored by its position via {@link colorForIndex} so a
 * slice matches its row dot. The hole shows the period total. Renders a muted
 * "No data" message when there is nothing to plot.
 */
export function SpendingDonutChart({ data, size = SIZE }: SpendingDonutChartProps) {
  const styles = useThemedStyles(makeStyles);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Typography variant="muted">No data for this period.</Typography>
      </View>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);

  // Lay each arc end-to-end around the ring, accumulating the start offset.
  let offset = 0;
  const slices = data.map((d, i) => {
    const fraction = total > 0 ? d.amount / total : 0;
    const arc = fraction * CIRCUMFERENCE;
    const slice = {
      key: d.categoryId,
      index: i,
      color: colorForIndex(i),
      dashArray: `${arc} ${CIRCUMFERENCE - arc}`,
      dashOffset: -offset,
    };
    offset += arc;
    return slice;
  });

  const scale = size / SIZE;

  return (
    <View testID="spending-donut-chart" style={[styles.wrap, { height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Rotate so the first slice starts at 12 o'clock and runs clockwise. */}
        <G rotation={-90} origin={`${CENTER}, ${CENTER}`}>
          {slices.map((s) => (
            <Circle
              key={s.key}
              testID={`donut-slice-${s.index}`}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={s.dashArray}
              strokeDashoffset={s.dashOffset}
            />
          ))}
        </G>
      </Svg>
      <View style={[styles.center, { transform: [{ scale }] }]} pointerEvents="none">
        <Typography variant="muted" style={styles.totalLabel}>
          TOTAL
        </Typography>
        <Typography variant="subheading">{groupDigits(Math.trunc(total).toString())}</Typography>
        <Typography variant="muted" style={styles.totalUnit}>
          FCFA
        </Typography>
      </View>
    </View>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    letterSpacing: 1,
  },
  totalUnit: {
    fontSize: 11,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
