import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, type Bucket } from '@/constants/allocation';
import {
  BORDER,
  DANGER,
  PRIMARY_GREEN,
  SUCCESS,
  TEXT_MUTED,
  WARNING,
  WARNING_LIGHT,
  WARNING_TEXT,
} from '@/constants/colors';
import type { IconName } from '@/constants/icons';
import { RADIUS } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO } from '@/utils/formatDate';

import { useBudgetStatus, useUnallocatedPool } from './budget.hooks';
import type { AllocationBreakdown, MonthlyBudget } from './budget.types';

export interface BudgetOverviewProps {
  /** Defaults to the current month (`YYYY-MM`). Override in tests. */
  monthISO?: string;
}

/** Leading glyph for each allocation bucket row. */
const BUCKET_ICONS: Record<Bucket, IconName> = {
  emergency_fund: 'alert',
  savings: 'wallet',
  projects: 'projects',
  expenses: 'expense',
};

/**
 * The Budget tab body. Renders the monthly breakdown when income exists, an
 * empty state when it doesn't. A hero card surfaces the remaining expense
 * budget with a spent-vs-allocated progress bar; a second card lists the four
 * allocation buckets. The "Edit allocation" button routes to settings
 * regardless of state. Lock status surfaces as an inline pill.
 */
export function BudgetOverview({ monthISO = currentMonthISO() }: BudgetOverviewProps) {
  const router = useRouter();
  const { budget, loading, error } = useBudgetStatus(monthISO);
  const { total: heldTotal } = useUnallocatedPool();

  return (
    <View style={styles.container}>
      <Typography variant="heading">Budget</Typography>

      {loading || !budget ? (
        <Typography variant="muted">Loading…</Typography>
      ) : budget.incomeTotal === 0 ? (
        <Typography variant="muted">Log income to start tracking your budget.</Typography>
      ) : (
        <>
          <HeroCard budget={budget} />
          <AllocationCard budget={budget} />
        </>
      )}

      {heldTotal > 0 ? (
        <Card>
          <Pressable
            testID="unallocated-pool-link"
            style={styles.poolRow}
            onPress={() => router.push('/budget/unallocated')}
          >
            <View style={styles.poolBody}>
              <Typography variant="label">Unallocated income</Typography>
              <Typography variant="muted">Held — tap to decide where it goes</Typography>
            </View>
            <Typography variant="subheading">{formatCurrency(heldTotal)}</Typography>
          </Pressable>
        </Card>
      ) : null}

      <Button label="Edit allocation" onPress={() => router.push('/budget/settings')} />
      <Button label="Funds" variant="secondary" onPress={() => router.push('/funds')} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

/** Remaining-budget hero with a spent-vs-allocated progress bar and lock pill. */
function HeroCard({ budget }: { budget: MonthlyBudget }) {
  const expenseBudget = budget.breakdown.expenses;
  const spentPct = expenseBudget > 0 ? Math.round((budget.expensesLogged / expenseBudget) * 100) : 0;
  const isOver = budget.expensesRemaining < 0;
  const barColor = isOver ? DANGER : spentPct >= 80 ? WARNING : SUCCESS;

  return (
    <Card>
      {budget.allocation.isLocked ? (
        <View style={styles.pill}>
          <Typography style={styles.pillText}>🔒 Locked for this month</Typography>
        </View>
      ) : null}

      <Typography variant="label">Expenses remaining</Typography>
      <Typography variant="display" style={isOver ? styles.overAmount : undefined}>
        {formatCurrency(budget.expensesRemaining)}
      </Typography>

      <ProgressBar
        testID="expense-progress"
        value={spentPct}
        color={barColor}
        style={styles.heroBar}
      />
      <Typography variant="muted">
        {formatCurrency(budget.expensesLogged)} of {formatCurrency(expenseBudget)} spent
      </Typography>
    </Card>
  );
}

/** Card listing the four allocation buckets in priority order. */
function AllocationCard({ budget }: { budget: MonthlyBudget }) {
  return (
    <Card>
      <Typography variant="label">This month's allocation</Typography>
      {budget.allocation.priorityOrder.map((bucket, index) => (
        <BucketRow
          key={bucket}
          bucket={bucket}
          amount={amountFor(bucket, budget.breakdown)}
          income={budget.incomeTotal}
          first={index === 0}
        />
      ))}
    </Card>
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
  income: number;
  first: boolean;
}

function BucketRow({ bucket, amount, income, first }: BucketRowProps) {
  const sharePct = income > 0 ? Math.round((amount / income) * 100) : 0;

  return (
    <View testID={`bucket-row-${bucket}`} style={[styles.row, first && styles.rowFirst]}>
      <View style={styles.rowIcon}>
        <Icon name={BUCKET_ICONS[bucket]} size={18} color={TEXT_MUTED} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Typography>{BUCKET_LABELS[bucket]}</Typography>
          <Typography variant="subheading">{formatCurrency(amount)}</Typography>
        </View>
        <ProgressBar value={sharePct} color={PRIMARY_GREEN} style={styles.shareBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: WARNING_LIGHT,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  pillText: {
    color: WARNING_TEXT,
    fontSize: 12,
  },
  heroBar: {
    marginTop: 12,
    marginBottom: 8,
  },
  overAmount: {
    color: DANGER,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  rowFirst: {
    borderTopWidth: 0,
    marginTop: 8,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareBar: {
    height: 6,
  },
  poolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  poolBody: {
    flex: 1,
  },
  error: {
    color: DANGER,
  },
});
