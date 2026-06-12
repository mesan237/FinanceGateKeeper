import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { BORDER, DANGER, SUCCESS_TEXT, TEXT_MUTED } from '@/constants/colors';

import { SpendingBarChart } from './SpendingBarChart';
import type { CategoryDelta, MonthComparison as MonthComparisonData } from './reports.types';

export interface MonthComparisonProps {
  comparison: MonthComparisonData;
}

/** Formats a category's change for display: "+20%", "−50%", or "New" for a
 * first-time spend (null growth rate). */
function formatChange(delta: CategoryDelta): string {
  if (delta.pctChange === null) return 'New';
  const rounded = Math.round(delta.pctChange);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

/** Picks the indicator color: red for an increase, green for a decrease, muted
 * when there is no prior-month baseline. */
function changeColor(delta: CategoryDelta): string {
  if (delta.pctChange === null) return TEXT_MUTED;
  if (delta.pctChange > 0) return DANGER;
  if (delta.pctChange < 0) return SUCCESS_TEXT;
  return TEXT_MUTED;
}

/**
 * Month-over-month comparison: a grouped bar chart (current vs previous per
 * category) plus a list of per-category deltas with a color-coded change badge.
 */
export function MonthComparison({ comparison }: MonthComparisonProps) {
  const { categories } = comparison;

  // Two interleaved bars per category: current then previous.
  const labels = categories.flatMap((c) => [c.categoryLabel.slice(0, 4), '']);
  const values = categories.flatMap((c) => [c.current, c.previous]);

  return (
    <View style={styles.container}>
      <Typography variant="subheading">Spending vs previous month</Typography>
      {categories.length === 0 ? (
        <Typography variant="muted">No comparison data for last month.</Typography>
      ) : (
        <>
          <SpendingBarChart labels={labels} values={values} />
          {categories.map((c) => (
            <View key={c.categoryId} style={styles.row} testID={`comparison-row-${c.categoryId}`}>
              <Typography variant="body">{c.categoryLabel}</Typography>
              <Typography variant="label" style={{ color: changeColor(c) }}>
                {formatChange(c)}
              </Typography>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingVertical: 8,
  },
});
