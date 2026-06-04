import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, type Bucket } from '@/constants/allocation';
import { DANGER, WARNING } from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO } from '@/utils/formatDate';

import { useBudgetStatus } from './budget.hooks';
import type { AllocationBreakdown } from './budget.types';

export interface BudgetOverviewProps {
  /** Defaults to the current month (`YYYY-MM`). Override in tests. */
  monthISO?: string;
}

/**
 * The Budget tab body. Renders the monthly breakdown when income exists, an
 * empty state when it doesn't. The "Edit allocation" button routes to the
 * settings screen regardless of state. Lock status surfaces inline.
 */
export function BudgetOverview({ monthISO = currentMonthISO() }: BudgetOverviewProps) {
  const router = useRouter();
  const { budget, loading, error } = useBudgetStatus(monthISO);

  return (
    <View style={styles.container}>
      <Typography variant="heading">Budget</Typography>

      {loading || !budget ? (
        <Typography variant="muted">Loading…</Typography>
      ) : budget.incomeTotal === 0 ? (
        <Typography variant="muted">Log income to start tracking your budget.</Typography>
      ) : (
        <>
          {budget.allocation.isLocked ? (
            <Typography style={styles.lockedBanner}>🔒 Locked for this month</Typography>
          ) : null}

          <Typography variant="subheading">Expenses remaining</Typography>
          <Typography variant="heading">{formatCurrency(budget.expensesRemaining)}</Typography>

          {budget.allocation.priorityOrder.map((bucket) => (
            <BucketRow key={bucket} bucket={bucket} amount={amountFor(bucket, budget.breakdown)} />
          ))}
        </>
      )}

      <Button label="Edit allocation" onPress={() => router.push('/budget/settings')} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

function amountFor(bucket: Bucket, breakdown: AllocationBreakdown): number {
  switch (bucket) {
    case 'emergency_fund':
      return breakdown.emergencyFund;
    case 'savings':
      return breakdown.savings;
    case 'projects':
      return breakdown.projects;
    case 'expenses':
      return breakdown.expenses;
  }
}

interface BucketRowProps {
  bucket: Bucket;
  amount: number;
}

function BucketRow({ bucket, amount }: BucketRowProps) {
  return (
    <View testID={`bucket-row-${bucket}`} style={styles.row}>
      <Typography>{BUCKET_LABELS[bucket]}</Typography>
      <Typography>{formatCurrency(amount)}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  lockedBanner: {
    color: WARNING,
  },
  error: {
    color: DANGER,
  },
});
