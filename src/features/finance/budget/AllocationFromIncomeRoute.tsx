import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { AllocationScreen } from './AllocationScreen';

/**
 * Reads `?amount=<number>&month=<YYYY-MM>` from the route's search params,
 * validates them, and renders `<AllocationScreen>` with typed props. Lives in
 * the budget feature (not in `app/`) so the thin-route rule holds — only
 * features may import `expo-router`'s hooks and `@/components/*`.
 *
 * A stray manual navigation (missing or malformed params) renders a muted
 * error line instead of crashing.
 */
export function AllocationFromIncomeRoute() {
  const params = useLocalSearchParams<{ amount?: string; month?: string; incomeId?: string }>();
  const amount = Number(params.amount);
  const month = typeof params.month === 'string' ? params.month : '';
  const incomeId = Number(params.incomeId);
  const validAmount = Number.isFinite(amount) && Number.isInteger(amount) && amount > 0;
  const validMonth = /^\d{4}-\d{2}$/.test(month);
  const validIncomeId = Number.isInteger(incomeId) && incomeId > 0;

  if (!validAmount || !validMonth || !validIncomeId) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid allocation parameters.</Typography>
      </View>
    );
  }

  return <AllocationScreen amountFCFA={amount} monthISO={month} incomeId={incomeId} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
