import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

const HEIGHT = 120;
/** Drawn in a fixed viewBox and stretched to the card — no layout measurement needed. */
const VIEW_WIDTH = 300;

export interface BurndownPoint {
  day: number;
  ideal: number;
  actual: number;
}

export interface BudgetBurndownProps {
  points: BurndownPoint[];
  /** The month's full budget — the value both lines start from. */
  available: number;
  /** Total days in the month, so the ideal line reaches zero at the right edge. */
  totalDays: number;
  testID?: string;
}

/**
 * Remaining budget over the month: a straight "ideal" line falling to zero
 * against the actual balance as it really fell.
 *
 * The gap between the lines is the point. A percentage cannot tell you whether
 * being at 60% is early or late in the month, but two diverging lines say
 * "ahead" or "behind" instantly — and the shape shows *when* it went wrong, not
 * just that it did.
 */
export function BudgetBurndown({
  points,
  available,
  totalDays,
  testID,
}: BudgetBurndownProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

  if (points.length < 2 || available <= 0) {
    return (
      <Typography variant="muted" testID={testID ? `${testID}-empty` : undefined}>
        Not enough of the month has passed to chart a trend yet.
      </Typography>
    );
  }

  // The actual line can dip below zero once overspent; the scale follows it so
  // the overshoot stays visible instead of being clipped at the axis.
  const lowest = Math.min(0, ...points.map((p) => p.actual));
  const span = available - lowest;

  const x = (day: number) => (day / totalDays) * VIEW_WIDTH;
  const y = (value: number) => HEIGHT - ((value - lowest) / span) * HEIGHT;

  const actualPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(2)},${y(p.actual).toFixed(2)}`)
    .join(' ');

  const zeroY = y(0);
  const last = points[points.length - 1];
  const isBehind = last.actual < last.ideal;

  return (
    <View style={styles.wrap} testID={testID}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${HEIGHT}`}>
        {/* Zero line — only meaningful once the actual balance can cross it. */}
        {lowest < 0 ? (
          <Line
            x1={0}
            y1={zeroY}
            x2={VIEW_WIDTH}
            y2={zeroY}
            stroke={c.BORDER_STRONG}
            strokeWidth={1}
          />
        ) : null}

        {/* Ideal: full budget on day 0 down to nothing on the last day. */}
        <Line
          x1={x(0)}
          y1={y(available)}
          x2={x(totalDays)}
          y2={y(0)}
          stroke={c.BORDER_STRONG}
          strokeWidth={2}
          strokeDasharray="4 4"
        />

        <Path
          d={actualPath}
          stroke={isBehind ? c.DANGER : c.PRIMARY_GREEN}
          strokeWidth={2.5}
          fill="none"
        />
      </Svg>

      <View style={styles.legend}>
        <Typography variant="muted">
          {isBehind
            ? `Behind pace — ${formatCurrency(Math.round(last.ideal - last.actual))} ahead of plan`
            : `Ahead of pace — ${formatCurrency(Math.round(last.actual - last.ideal))} in hand`}
        </Typography>
      </View>
    </View>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  wrap: {
    gap: SPACING.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
