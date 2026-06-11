import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { PRIMARY_GREEN } from '@/constants/colors';
import { ICON_SIZE } from '@/constants/icons';

import { AddTransactionSheet } from './AddTransactionSheet';
import { TransactionList } from './TransactionList';

/**
 * The Transactions tab: the unified income+expense feed plus a single circular
 * FAB that opens the `AddTransactionSheet` (Expense / Income / Templates). An
 * expense or template logged from the sheet bumps `reloadToken` so the feed
 * refreshes in place without navigating away.
 */
export function TransactionsScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <View style={styles.container}>
      <TransactionList reloadToken={reloadToken} />

      <Pressable
        testID="add-transaction-fab"
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setSheetOpen(true)}
      >
        <Icon name="add" size={ICON_SIZE.lg} color="#FFFFFF" />
      </Pressable>

      <AddTransactionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onExpenseSaved={() => setReloadToken((t) => t + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabPressed: {
    opacity: 0.85,
  },
});
