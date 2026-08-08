import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, type Bucket } from '@/constants/allocation';
import { FONT_FAMILY } from '@/constants/fonts';
import type { IconName } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { useBudgetStatus } from './budget.hooks';
import type { AllocationBreakdown, MonthlyBudget } from './budget.types';

export interface IncomeSplitCardProps {
  month: string;
}

/** Leading glyph for each allocation bucket row. */
const BUCKET_ICONS: Record<Bucket, IconName> = {
  emergency_fund: 'alert',
  savings: 'wallet',
  projects: 'projects',
  expenses: 'expense',
};

/**
 * How this month's income was split across the four buckets.
 *
 * Demoted from the top of the Budget tab: the split describes where income
 * *went*, which is context rather than the thing a user checks a budget to find
 * out. It stays available — and it is still where the spendable total comes from
 * when no explicit budget is set — but it no longer competes with the figures
 * that drive daily decisions.
 *
 * The bars are a **single stacked composition bar**, not one bar per bucket. The
 * old per-bucket bars plotted each bucket's share of income, so they always
 * summed to 100% across rows and read like progress toward a goal that did not
 * exist. A stacked bar says "this is one pot, divided" — which is the truth.
 */
export function IncomeSplitCard({ month }: IncomeSplitCardProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { budget } = useBudgetStatus(month);

  if (!budget || budget.incomeTotal === 0) return null;

  return (
    <Card testID="income-split-card">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="label">Income split</Typography>
          <Typography variant="muted">
            {`${formatCurrency(budget.incomeTotal)} allocated this month`}
          </Typography>
        </View>
        {budget.allocation.isLocked ? (
          <Pill label="Locked" tone="warning" testID="income-split-locked" />
        ) : null}
      </View>

      <StackedSplitBar budget={budget} />

      {budget.allocation.priorityOrder.map((bucket) => (
        <BucketRow
          key={bucket}
          bucket={bucket}
          amount={amountFor(bucket, budget.breakdown)}
          income={budget.incomeTotal}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/budget/settings', params: { month } })}
        testID="income-split-edit"
        style={styles.editRow}
      >
        <Typography style={styles.editText}>Edit split</Typography>
      </Pressable>
    </Card>
  );
}

/** One horizontal bar divided into the four bucket shares. */
function StackedSplitBar({ budget }: { budget: MonthlyBudget }) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const colors: Record<Bucket, string> = {
    emergency_fund: c.DANGER,
    savings: c.PRIMARY_GREEN,
    projects: c.WARNING,
    expenses: c.BORDER_STRONG,
  };

  return (
    <View style={styles.stack} testID="income-split-bar">
      {budget.allocation.priorityOrder.map((bucket) => {
        const share =
          budget.incomeTotal > 0
            ? (amountFor(bucket, budget.breakdown) / budget.incomeTotal) * 100
            : 0;
        if (share <= 0) return null;
        return (
          <View
            key={bucket}
            testID={`income-split-segment-${bucket}`}
            style={{ width: `${share}%`, backgroundColor: colors[bucket] }}
          />
        );
      })}
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
  income: number;
}

function BucketRow({ bucket, amount, income }: BucketRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const sharePct = income > 0 ? Math.round((amount / income) * 100) : 0;

  return (
    <View testID={`bucket-row-${bucket}`} style={styles.row}>
      <Icon name={BUCKET_ICONS[bucket]} size={16} color={c.TEXT_MUTED} />
      <Typography style={styles.rowLabel}>{BUCKET_LABELS[bucket]}</Typography>
      <Typography variant="muted">{`${sharePct}%`}</Typography>
      <Typography style={styles.rowAmount}>{formatCurrency(amount)}</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  stack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: c.BORDER,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
  rowLabel: {
    flex: 1,
  },
  rowAmount: {
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
    minWidth: 96,
    textAlign: 'right',
  },
  editRow: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
    alignItems: 'center',
  },
  editText: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    fontSize: 13,
  },
});
