import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';

import { ExpenseEntryPanel } from './ExpenseEntryPanel';

/**
 * Manual expense entry route: a header plus the shared `ExpenseEntryPanel`. On a
 * successful save it returns to the transactions tab. The form body itself lives
 * in the panel, shared with the unified `AddTransactionSheet`.
 */
export function ExpenseLogScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Log Expense" cancelLabel="Cancel" />
      <ExpenseEntryPanel onSaved={() => router.replace('/(tabs)/transactions')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});
