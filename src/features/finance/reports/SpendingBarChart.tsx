import React from 'react';
import { Dimensions, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { RADIUS } from '@/constants/layout';
import { useTheme } from '@/theme';

export interface SpendingBarChartProps {
  labels: string[];
  values: number[];
  /** Width in dp; defaults to the window width minus standard 16dp side padding. */
  width?: number;
}

/**
 * Thin wrapper around `react-native-chart-kit`'s `BarChart`. Renders nothing
 * when there is no spend to show (empty or all-zero values), so callers don't
 * need to guard. Bars use the app's primary green.
 */
export function SpendingBarChart({ labels, values, width }: SpendingBarChartProps) {
  const c = useTheme();
  if (values.length === 0 || values.every((v) => v === 0)) return null;

  const chartConfig = {
    backgroundGradientFrom: c.SURFACE,
    backgroundGradientTo: c.SURFACE,
    decimalPlaces: 0,
    color: () => c.PRIMARY_GREEN,
    labelColor: () => c.TEXT_SECONDARY,
    barPercentage: 0.6,
  };

  const chartWidth = width ?? Dimensions.get('window').width - 32;
  return (
    <View testID="spending-bar-chart">
      <BarChart
        data={{ labels, datasets: [{ data: values }] }}
        width={chartWidth}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        fromZero
        withInnerLines={false}
        chartConfig={chartConfig}
        style={{ borderRadius: RADIUS.md }}
      />
    </View>
  );
}
