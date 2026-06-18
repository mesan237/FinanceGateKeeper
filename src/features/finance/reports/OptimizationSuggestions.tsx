import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
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
  return (
    <View style={styles.container}>
      <Typography variant="subheading">Suggestions</Typography>
      {suggestions.length === 0 ? (
        <Typography variant="muted">No suggestions for this month.</Typography>
      ) : (
        suggestions.map((s) => (
          <View key={s.categoryLabel} style={styles.item} testID={`suggestion-${s.categoryLabel}`}>
            <Typography variant="body">{s.message}</Typography>
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
