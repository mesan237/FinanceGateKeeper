import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import type { ActionBarStyle } from '@/types/settings';

import { TransactionList } from './TransactionList';

export interface TransactionsScreenProps {
  actionBarStyle: ActionBarStyle;
}

/**
 * The Transactions tab: unified income+expense feed plus the floating action
 * bar. In `explicit` mode the bar always shows Quick Add (compact) and Log
 * Expense (primary). In `speed_dial` mode a single "+" FAB expands to a Modal
 * with both options — keeping the screen clean without losing discoverability.
 */
export function TransactionsScreen({ actionBarStyle }: TransactionsScreenProps) {
  const router = useRouter();
  const [dialOpen, setDialOpen] = useState(false);

  if (actionBarStyle === 'speed_dial') {
    return (
      <View style={styles.container}>
        <TransactionList />
        <View style={styles.fab}>
          <Button
            testID="speed-dial-fab"
            label="+"
            onPress={() => setDialOpen(true)}
          />
        </View>

        <Modal visible={dialOpen} onRequestClose={() => setDialOpen(false)} transparent animationType="fade">
          <View style={styles.dialOptions}>
            <Button
              label="+ Log Expense"
              onPress={() => {
                setDialOpen(false);
                router.push('/expenses/log');
              }}
            />
            <Button
              label="Quick Add"
              onPress={() => {
                setDialOpen(false);
                router.push('/expenses/quick-add');
              }}
            />
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TransactionList />
      <View style={styles.fab}>
        <View style={styles.secondaryRow}>
          <View style={styles.grow}>
            <Button compact label="Quick Add" onPress={() => router.push('/expenses/quick-add')} />
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
  dialOptions: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
});
