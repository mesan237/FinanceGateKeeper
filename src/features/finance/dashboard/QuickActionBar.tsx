import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import type { DayActivityStatus } from '@/features/finance/expenses/expenses.types';

interface QuickActionBarProps {
  zeroDay: DayActivityStatus;
  onConfirmZeroDay: () => void;
}

/**
 * Fixed action bar at the bottom of the dashboard with shortcuts to the three
 * most common actions. "Confirm Zero Day" is hidden once the day has activity
 * (an expense logged or an explicit zero-day confirmation).
 */
export function QuickActionBar({ zeroDay, onConfirmZeroDay }: QuickActionBarProps) {
  const router = useRouter();
  const showZeroDay = !zeroDay.hasExpenses && !zeroDay.zeroDayConfirmed;

  return (
    <View style={styles.bar}>
      <Button
        testID="quick-log-expense"
        label="Log Expense"
        onPress={() => router.push('/expenses/log')}
        style={styles.button}
      />
      <Button
        testID="quick-log-income"
        label="Log Income"
        onPress={() => router.push('/income/log')}
        style={styles.button}
      />
      {showZeroDay && (
        <Button
          testID="quick-confirm-zero-day"
          label="Zero Day"
          onPress={onConfirmZeroDay}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  button: {
    flex: 1,
  },
});
