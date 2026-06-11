import React from 'react';
import { Dimensions, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { PRIMARY_GREEN, SURFACE, TEXT_SECONDARY } from '@/constants/colors';

export interface SpendingBarChartProps {
  labels: string[];
  values: number[];
  /** Width in dp; defaults to the window width minus standard 16dp side padding. */
  width?: number;
}

const chartConfig = {
  backgroundGradientFrom: SURFACE,
  backgroundGradientTo: SURFACE,
  decimalPlaces: 0,
  color: () => PRIMARY_GREEN,
  labelColor: () => TEXT_SECONDARY,
  barPercentage: 0.6,
};

/**
 * Thin wrapper around `react-native-chart-kit`'s `BarChart`. Renders nothing
 * when there is no spend to show (empty or all-zero values), so callers don't
 * need to guard. Bars use the app's primary green.
 */
export function SpendingBarChart({ labels, values, width }: SpendingBarChartProps) {
  if (values.length === 0 || values.every((v) => v === 0)) return null;

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
        style={{ borderRadius: 12 }}
      />
    </View>
  );
}
