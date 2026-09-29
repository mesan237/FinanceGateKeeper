import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import { SpendingBarChart } from './SpendingBarChart';
import type { CategoryDelta, MonthComparison as MonthComparisonData } from './reports.types';

export interface MonthComparisonProps {
  comparison: MonthComparisonData;
}

/** Formats a category's change for display: "+20%", "−50%", or "New" for a
 * first-time spend (null growth rate). */
function formatChange(delta: CategoryDelta, newLabel: string): string {
  if (delta.pctChange === null) return newLabel;
  const rounded = Math.round(delta.pctChange);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

/** Picks the indicator color: red for an increase, green for a decrease, muted
 * when there is no prior-month baseline. */
function changeColor(delta: CategoryDelta, colors: ThemeColors): string {
  if (delta.pctChange === null) return colors.TEXT_MUTED;
  if (delta.pctChange > 0) return colors.DANGER;
  if (delta.pctChange < 0) return colors.SUCCESS_TEXT;
  return colors.TEXT_MUTED;
}

/**
 * Month-over-month comparison: a grouped bar chart (current vs previous per
 * category) plus a list of per-category deltas with a color-coded change badge.
 */
export function MonthComparison({ comparison }: MonthComparisonProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useTheme();
  const { t } = useTranslation('reports');
  const { categories } = comparison;

  // Two interleaved bars per category: current then previous.
  const labels = categories.flatMap((c) => [displayCategoryName(c.categoryLabel).slice(0, 4), '']);
  const values = categories.flatMap((c) => [c.current, c.previous]);

  return (
    <View style={styles.container}>
      <Typography variant="subheading">{t('comparison.title')}</Typography>
      {categories.length === 0 ? (
        <Typography variant="muted">{t('comparison.empty')}</Typography>
      ) : (
        <>
          <SpendingBarChart labels={labels} values={values} />
          {categories.map((c) => (
            <View key={c.categoryId} style={styles.row} testID={`comparison-row-${c.categoryId}`}>
              <Typography variant="body">{displayCategoryName(c.categoryLabel)}</Typography>
              <Typography variant="label" style={{ color: changeColor(c, colors) }}>
                {formatChange(c, t('comparison.new'))}
              </Typography>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
    paddingVertical: 8,
  },
});
