import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, type Bucket } from '@/constants/allocation';
import { DANGER } from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';

import { depositToFund } from '@/features/finance/funds/funds.service';
import { fundProjects } from '@/features/finance/projects/projects.service';

import { useAllocation } from './budget.hooks';
import { calculateBreakdown, redistributeEmergencyPct } from './budget.service';
import type { Allocation, AllocationBreakdown } from './budget.types';

export interface AllocationScreenProps {
  /** The income amount, in FCFA, being allocated. */
  amountFCFA: number;
  /** The month the income belongs to, as `YYYY-MM`. */
  monthISO: string;
}

/**
 * Post-income breakdown screen. Computes how `amountFCFA` splits across the
 * four buckets according to the current month's allocation, then offers a
 * Confirm button that locks the month and routes to the dashboard. Editing
 * the percentages lives in `AllocationSettings`, not here.
 */
export function AllocationScreen({ amountFCFA, monthISO }: AllocationScreenProps) {
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
      allocation={allocation}
      onLock={lock}
      error={error}
    />
  );
}

interface AllocationScreenBodyProps {
  amountFCFA: number;
  monthISO: string;
  allocation: Allocation;
  onLock: () => Promise<void>;
  error: string | null;
}

function AllocationScreenBody({
  amountFCFA,
  monthISO,
  allocation,
  onLock,
  error,
}: AllocationScreenBodyProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const breakdown = calculateBreakdown(amountFCFA, allocation);

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
      if (breakdown.projects > 0) {
        await fundProjects(breakdown.projects, reason);
      }
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  error: {
    color: DANGER,
  },
});
