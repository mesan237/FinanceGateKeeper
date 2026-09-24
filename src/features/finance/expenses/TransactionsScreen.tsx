import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { ICON_SIZE } from '@/constants/icons';
import { RADIUS, SHADOW } from '@/constants/layout';
import { hapticTap } from '@/utils/haptics';

import { AddTransactionSheet } from './AddTransactionSheet';
import { TransactionList } from './TransactionList';

/**
 * The Transactions tab: the unified income+expense feed plus a single circular
 * FAB that opens the `AddTransactionSheet` (Expense / Income / Templates). An
 * expense or template logged from the sheet bumps `reloadToken` so the feed
 * refreshes in place without navigating away.
 */
export function TransactionsScreen() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  return (
    <View style={styles.container}>
      <TransactionList reloadToken={reloadToken} />

      <Pressable
        testID="add-transaction-fab"
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        style={({ pressed }) => [
          styles.fab,
          { bottom: 24 + insets.bottom },
          pressed && styles.fabPressed,
        ]}
        onPress={() => {
          hapticTap();
          setSheetOpen(true);
        }}
      >
        <Icon name="add" size={ICON_SIZE.lg} color={c.TEXT_INVERSE} />
      </Pressable>

      <AddTransactionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => setReloadToken((t) => t + 1)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: c.PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.floating,
  },
  fabPressed: {
    opacity: 0.85,
  },
});
