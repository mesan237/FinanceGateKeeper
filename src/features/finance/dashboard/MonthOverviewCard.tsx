import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Pill, type PillTone } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import type { BudgetSummary, Cashflow, PaceLevel } from './dashboard.types';

/** Chip wording and tone per pace level. */
const PACE_DISPLAY: Record<PaceLevel, { label: string; tone: PillTone }> = {
  green: { label: 'On Track', tone: 'success' },
  yellow: { label: 'Watch Out', tone: 'warning' },
  red: { label: 'Over Budget', tone: 'danger' },
};

export interface MonthOverviewCardProps {
  /** The month being summarised, `YYYY-MM`. */
  monthISO: string;
  /** Whole days left in the month after today. */
  daysRemaining: number;
  summary: BudgetSummary;
  cashflow: Cashflow;
  /** Invoked by the no-budget prompt. The screen owns the navigation. */
  onSetBudget: () => void;
}

/**
 * The dashboard's headline card: everything about the month in one place —
 * which month it is and how much of it is left, what remains to spend against
 * the budget, and the in/out/net of what has actually been logged.
 *
 * Two deliberate choices:
 *
 *  - Without a budget the figure is an em-dash, not `0 FCFA`. A zero remainder
 *    under a full green "On Track" chip is a confident statement about a budget
 *    that does not exist; the prompt to set one is the honest thing to show.
 *  - The cashflow row survives that empty state. Income and expenses are logged
 *    facts, so they stay readable whether or not a budget frames them.
 */
export function MonthOverviewCard({
  monthISO,
  daysRemaining,
  summary,
  cashflow,
  onSetBudget,
}: MonthOverviewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

  const hasBudget = summary.expenseBudget > 0;
  const isOver = summary.expensesRemaining < 0;
  const pace = PACE_DISPLAY[summary.pace];
  const netColor = cashflow.net >= 0 ? c.SUCCESS_TEXT : c.DANGER;

  // The dashboard only ever shows the current month, so the year in
  // `monthLabel` ("September 2026") is noise in a header this small.
  const [monthName] = monthLabel(monthISO).split(' ');

  return (
    <Card testID="month-overview-card">
      <View style={styles.monthRow}>
        <Typography variant="label" style={styles.monthName}>
          {monthName.toUpperCase()}
        </Typography>
        <Typography variant="muted" testID="month-overview-days">
          {daysLeftLabel(daysRemaining)}
        </Typography>
      </View>

      <Typography variant="label" style={styles.remainingLabel}>
        {isOver ? 'Over budget by' : 'Left to spend'}
      </Typography>

      {hasBudget ? (
        <AnimatedCounter
          value={Math.abs(summary.expensesRemaining)}
          style={[styles.amount, isOver && styles.amountOver]}
          testID="month-overview-amount"
        />
      ) : (
        <Typography style={styles.amount} testID="month-overview-amount">
          — FCFA
        </Typography>
      )}

      {hasBudget ? (
        <>
          <ProgressBar
            testID="budget-progress"
            value={summary.spentPct}
            color={paceBarColor(summary.pace, c)}
            animated
            style={styles.bar}
          />
          <View style={styles.metaRow}>
            <Typography variant="muted">
              {`${formatCurrency(summary.expensesLogged)} of ${formatCurrency(summary.expenseBudget)} spent`}
            </Typography>
            <Typography variant="muted">{`${Math.round(summary.spentPct)}%`}</Typography>
          </View>
          <Pill
            label={pace.label}
            tone={pace.tone}
            testID="budget-pace-chip"
            style={styles.paceChip}
          />
        </>
      ) : (
        <Pressable
          testID="month-overview-set-budget"
          accessibilityRole="button"
          accessibilityLabel="Set a monthly budget to track this"
          onPress={onSetBudget}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Icon name="add" size={ICON_SIZE.md} color={c.PRIMARY_GREEN} />
          <Typography style={styles.ctaText}>Set a monthly budget to track this</Typography>
          <Icon name="forward" size={ICON_SIZE.md} color={c.PRIMARY_GREEN} />
        </Pressable>
      )}

      <View style={styles.cashflowRow}>
        <CashflowStat label="In" value={cashflow.income} />
        <View style={styles.divider} />
        <CashflowStat label="Out" value={cashflow.expenses} />
        <View style={styles.divider} />
        <CashflowStat label="Net" value={cashflow.net} color={netColor} testID="cashflow-net" />
      </View>
    </Card>
  );
}

/** "6 days left" / "1 day left" / "Last day" — the month's remaining runway. */
function daysLeftLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Last day';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
}

/** The progress bar's fill colour for a pace level. */
function paceBarColor(pace: PaceLevel, c: ThemeColors): string {
  if (pace === 'red') return c.DANGER;
  if (pace === 'yellow') return c.WARNING;
  return c.SUCCESS;
}

/** One figure in the in/out/net row, with its caption above. */
function CashflowStat({
  label,
  value,
  color,
  testID,
}: {
  label: string;
  value: number;
  color?: string;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.cashflowCol}>
      <Typography variant="muted">{label}</Typography>
      <AnimatedCounter
        value={value}
        style={[styles.cashflowAmount, color ? { color } : null]}
        testID={testID}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  monthName: {
    letterSpacing: 0.8,
  },
  remainingLabel: {
    marginTop: SPACING.md,
  },
  amount: {
    color: c.TEXT_PRIMARY,
    fontSize: 34,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD,
    letterSpacing: -0.5,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  amountOver: {
    color: c.DANGER,
  },
  bar: {
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  paceChip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: c.PRIMARY_LIGHT,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  ctaPressed: {
    opacity: 0.7,
  },
  ctaText: {
    flex: 1,
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  cashflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
  },
  cashflowCol: {
    flex: 1,
    gap: SPACING.xs,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: c.BORDER,
    marginHorizontal: SPACING.md,
  },
  cashflowAmount: {
    color: c.TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
});
