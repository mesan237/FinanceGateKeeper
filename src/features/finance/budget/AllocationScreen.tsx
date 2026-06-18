import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, type Bucket } from '@/constants/allocation';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { formatCurrency } from '@/utils/formatCurrency';

import { depositToFund } from '@/features/finance/funds/funds.service';
import { markIncomeAllocated } from '@/features/finance/income/income.service';
import { fundProjects } from '@/features/finance/projects/projects.service';

import { useAllocation } from './budget.hooks';
import { calculateBreakdown, redistributeEmergencyPct } from './budget.service';
import type { Allocation, AllocationBreakdown } from './budget.types';

export interface AllocationScreenProps {
  /** The income amount, in FCFA, being allocated. */
  amountFCFA: number;
  /** The month the income belongs to, as `YYYY-MM`. */
  monthISO: string;
  /** The id of the just-logged income row this allocation confirms (VS-19). */
  incomeId: number;
}

/**
 * Post-income breakdown screen. Computes how `amountFCFA` splits across the
 * four buckets according to the current month's allocation. **Confirm** deposits
 * the fund/project portions, marks the income `allocated` (so it counts toward
 * the expense budget), locks the month, and routes to the dashboard.
 * **Hold for later** leaves the income `pending` in the unallocated pool.
 * Editing the percentages lives in `AllocationSettings`, not here.
 */
export function AllocationScreen({ amountFCFA, monthISO, incomeId }: AllocationScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { allocation, loading, error, lock } = useAllocation(monthISO);

  if (!allocation) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Allocation" />
        <Typography variant="muted">{loading ? 'Loading…' : 'No allocation yet.'}</Typography>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  return (
    <AllocationScreenBody
      amountFCFA={amountFCFA}
      monthISO={monthISO}
      incomeId={incomeId}
      allocation={allocation}
      onLock={lock}
      error={error}
    />
  );
}

interface AllocationScreenBodyProps {
  amountFCFA: number;
  monthISO: string;
  incomeId: number;
  allocation: Allocation;
  onLock: () => Promise<void>;
  error: string | null;
}

function AllocationScreenBody({
  amountFCFA,
  monthISO,
  incomeId,
  allocation,
  onLock,
  error,
}: AllocationScreenBodyProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const breakdown = calculateBreakdown(amountFCFA, allocation);

  const handleHold = () => {
    // The income was created `pending`; holding just leaves it in the pool.
    router.replace('/(tabs)/dashboard');
  };

  const handleConfirm = async () => {
    if (isConfirming) return;
    setIsConfirming(true);
    try {
      const reason = `Allocation ${monthISO}`;
      // Deposit this income's emergency/savings portions to their funds. A
      // zero-amount bucket (e.g. emergency after redistribution) is skipped —
      // `depositToFund` rejects non-positive amounts.
      let emergencyMetNow = false;
      if (breakdown.emergencyFund > 0) {
        const result = await depositToFund('emergency', breakdown.emergencyFund, reason);
        emergencyMetNow = result.targetNewlyMet;
      }
      if (breakdown.savings > 0) {
        await depositToFund('savings', breakdown.savings, reason);
      }
      // When the emergency fund first meets its target, fold its percentage into
      // the other buckets so future income stops being parked in a full fund.
      if (emergencyMetNow) {
        await redistributeEmergencyPct(monthISO);
      }
      // Fund projects by priority cascade with the projects-bucket amount.
      // (No reason/date arg — fundProjects records each contribution dated today.)
      if (breakdown.projects > 0) {
        await fundProjects(breakdown.projects);
      }
      // Mark the income allocated so it starts counting toward the expense
      // budget (VS-19 — pending income is excluded until confirmed).
      await markIncomeAllocated(incomeId);
      await onLock();
      router.replace('/(tabs)/dashboard');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Allocation" />
      <Typography variant="muted">{`${formatCurrency(amountFCFA)} · ${allocation.month}`}</Typography>

      {allocation.priorityOrder.map((bucket) => (
        <BucketRow key={bucket} bucket={bucket} amount={amountFor(bucket, breakdown)} />
      ))}

      <Button
        label="Confirm"
        onPress={handleConfirm}
        disabled={isConfirming}
      />

      <Button
        label="Hold for later"
        variant="secondary"
        onPress={handleHold}
        disabled={isConfirming}
      />

      <Typography variant="muted" style={styles.holdHint}>
        Holding keeps this income out of your expense budget until you allocate
        it from the unallocated pool.
      </Typography>

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
  const styles = useThemedStyles(makeStyles);
  return (
    <View testID={`bucket-row-${bucket}`} style={styles.row}>
      <Typography>{BUCKET_LABELS[bucket]}</Typography>
      <Typography>{formatCurrency(amount)}</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
  },
  holdHint: {
    textAlign: 'center',
  },
  error: {
    color: c.DANGER,
  },
});
