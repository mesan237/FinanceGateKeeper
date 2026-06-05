import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';

import { TransactionList } from './TransactionList';

/**
 * The Transactions tab: the filterable transaction list plus the floating
 * "+ Log Expense" entry point. Keeping the CTA and its navigation here (not in
 * the route file) preserves the thin-route rule and keeps `TransactionList`
 * free of navigation concerns.
 */
export function TransactionsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TransactionList />
      <View style={styles.fab}>
        <View style={styles.secondaryRow}>
          <View style={styles.grow}>
            <Button label="Quick Add" onPress={() => router.push('/expenses/quick-add')} />
          </View>
          <View style={styles.grow}>
            <Button label="Recurring" onPress={() => router.push('/expenses/recurring')} />
          </View>
          <View style={styles.grow}>
            <Button label="Debts" onPress={() => router.push('/debt')} />
          </View>
          <View style={styles.grow}>
            <Button label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>
        <Button label="+ Log Expense" onPress={() => router.push('/expenses/log')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    gap: 8,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  grow: {
    flex: 1,
  },
});
