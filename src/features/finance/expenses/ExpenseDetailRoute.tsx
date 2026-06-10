import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { ExpenseDetailScreen } from './ExpenseDetailScreen';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<ExpenseDetailScreen>`. Mirrors `DebtDetailRoute` and `ProjectDetailRoute`.
 */
export function ExpenseDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid expense id.</Typography>
      </View>
    );
  }

  return <ExpenseDetailScreen expenseId={id} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
