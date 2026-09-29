import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import type { OptimizationSuggestion } from './reports.types';

export interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
}

/**
 * Renders the rule-based optimization suggestions for a month. Each suggestion
 * is a single line of advice; an empty list shows a reassuring muted message.
 */
export function OptimizationSuggestions({ suggestions }: OptimizationSuggestionsProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('reports');
  return (
    <View style={styles.container}>
      <Typography variant="subheading">{t('suggestions.title')}</Typography>
      {suggestions.length === 0 ? (
        <Typography variant="muted">{t('suggestions.empty')}</Typography>
      ) : (
        suggestions.map((s) => (
          <View key={s.categoryLabel} style={styles.item} testID={`suggestion-${s.categoryLabel}`}>
            <Typography variant="body">
              {t('suggestions.increase', {
                category: displayCategoryName(s.categoryLabel),
                percent: Math.round(s.pctChange),
              })}
            </Typography>
          </View>
        ))
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    borderLeftWidth: 3,
    borderLeftColor: c.WARNING,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
    paddingLeft: 12,
    paddingVertical: 8,
  },
});
