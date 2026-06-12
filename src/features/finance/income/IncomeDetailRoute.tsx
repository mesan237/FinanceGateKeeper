import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { IncomeDetailScreen } from './IncomeDetailScreen';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<IncomeDetailScreen>`. Mirrors `ExpenseDetailRoute`.
 */
export function IncomeDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid income id.</Typography>
      </View>
    );
  }

  return <IncomeDetailScreen incomeId={id} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
