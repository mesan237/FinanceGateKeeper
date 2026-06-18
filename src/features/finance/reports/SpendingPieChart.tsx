import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import type { CategorySpend } from './reports.types';

export interface SpendingPieChartProps {
  data: CategorySpend[];
  /** Width in dp; defaults to the window width minus standard 16dp side padding. */
  width?: number;
}

/** Eight-color palette cycled by index, matching the default category order. */
const PALETTE = [
  '#4CAF50',
  '#2196F3',
  '#FF9800',
  '#E91E63',
  '#9C27B0',
  '#00BCD4',
  '#FF5722',
  '#607D8B',
];

/**
 * Thin wrapper around `react-native-chart-kit`'s `PieChart`. Maps
 * `CategorySpend[]` into the library's data shape, cycling a fixed 8-color
 * palette. Shows a muted "No data" message when there is nothing to plot.
 */
export function SpendingPieChart({ data, width }: SpendingPieChartProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const chartConfig = {
    color: () => c.TEXT_SECONDARY,
    backgroundGradientFrom: c.SURFACE,
    backgroundGradientTo: c.SURFACE,
  };
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Typography variant="muted">No data for this period.</Typography>
      </View>
    );
  }

  const chartWidth = width ?? Dimensions.get('window').width - 32;
  const chartData = data.map((d, i) => ({
    name: d.categoryLabel,
    population: d.amount,
    color: PALETTE[i % PALETTE.length],
    legendFontColor: c.TEXT_SECONDARY,
    legendFontSize: 12,
  }));

  return (
    <View testID="spending-pie-chart">
      <PieChart
        data={chartData}
        width={chartWidth}
        height={220}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="8"
        chartConfig={chartConfig}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
