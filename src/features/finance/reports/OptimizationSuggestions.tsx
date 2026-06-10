import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { BORDER, WARNING } from '@/constants/colors';

import type { OptimizationSuggestion } from './reports.types';

export interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
}

/**
 * Renders the rule-based optimization suggestions for a month. Each suggestion
 * is a single line of advice; an empty list shows a reassuring muted message.
 */
export function OptimizationSuggestions({ suggestions }: OptimizationSuggestionsProps) {
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

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    borderLeftWidth: 3,
    borderLeftColor: WARNING,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingLeft: 12,
    paddingVertical: 8,
  },
});
