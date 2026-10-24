import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Pill, type PillTone } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import type { UnplannedTotals } from '@/features/finance/expenses/expenses.types';

import type { BudgetSummary, Cashflow, DayLogging, PaceLevel } from './dashboard.types';

/** Chip tone per pace level; the wording comes from `dashboard.pace`. */
const PACE_TONE: Record<PaceLevel, PillTone> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
};

export interface MonthOverviewCardProps {
  /** The month being summarised, `YYYY-MM`. */
  monthISO: string;
  /** Whole days left in the month after today. */
  daysRemaining: number;
  summary: BudgetSummary;
  cashflow: Cashflow;
  /** Days logged so far this month; shown while the month has no plan (UX-04). */
  logging: DayLogging;
  /** The month's imprévus; the line under the cashflow shows only when there are some. */
  unplanned?: UnplannedTotals;
  /** Invoked by the "Plan a budget" link. The screen owns the navigation. */
  onSetBudget: () => void;
}

/**
 * The dashboard's headline card: which month it is and how much of it is left,
 * then one figure that answers "where do I stand?".
 *
 *  - With a plan: what is left in it, paced on a bar with a status word, then
 *    the money in and out.
 *  - Without one, the figure is what was spent so far, with how many days are
 *    logged (UX-04). Income received alone is not a plan, whatever it sizes
 *    behind the scenes, and the path starts by observing, so no limit is shown
 *    and no pace is judged. Planning stays one quiet link away.
 */
export function MonthOverviewCard({
  monthISO,
  daysRemaining,
  summary,
  cashflow,
  logging,
  unplanned,
  onSetBudget,
}: MonthOverviewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('dashboard');

  const planned = summary.isPlanned;
  const isOver = planned && summary.expensesRemaining < 0;
  const pace = { label: t(`pace.${summary.pace}`), tone: PACE_TONE[summary.pace] };
  const label = !planned ? t('month.spentThisMonth') : isOver ? t('month.overBy') : t('month.leftInPlan');

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
          {daysRemaining <= 0 ? t('month.lastDay') : t('month.daysLeft', { count: daysRemaining })}
        </Typography>
      </View>

      <Typography variant="label" style={styles.remainingLabel}>
        {label}
      </Typography>

      <AnimatedCounter
        value={planned ? Math.abs(summary.expensesRemaining) : cashflow.expenses}
        style={[styles.amount, isOver && styles.amountOver]}
        testID="month-overview-amount"
      />

      {planned ? (
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
              {t('month.spentOf', {
                spent: formatCurrency(summary.expensesLogged),
                budget: formatCurrency(summary.expenseBudget),
              })}
            </Typography>
            <Typography variant="muted">{`${Math.round(summary.spentPct)}%`}</Typography>
          </View>
          <Pill
            label={pace.label}
            tone={pace.tone}
            testID="budget-pace-chip"
            style={styles.paceChip}
          />
          <View style={styles.cashflowRow}>
            <CashflowStat label={t('month.in')} value={cashflow.income} />
            <View style={styles.divider} />
            <CashflowStat label={t('month.out')} value={cashflow.expenses} />
          </View>
        </>
      ) : (
        <>
          <Typography variant="muted" testID="month-overview-logging">
            {t('month.daysLogged', { logged: logging.loggedDays, count: logging.daysSoFar })}
          </Typography>
          <Typography variant="muted" testID="month-overview-income" style={styles.incomeLine}>
            {t('month.incomeLine', { amount: formatCurrency(cashflow.income) })}
          </Typography>
          <Pressable
            testID="month-overview-set-budget"
            accessibilityRole="button"
            onPress={onSetBudget}
            hitSlop={8}
            style={({ pressed }) => [styles.planLink, pressed && styles.planLinkPressed]}
          >
            <Typography style={styles.planLinkText}>{t('month.planLink')}</Typography>
          </Pressable>
        </>
      )}

      {unplanned && unplanned.count > 0 ? (
        <View style={styles.unplannedRow}>
          <View style={styles.unplannedDot} />
          <Typography variant="muted" testID="month-overview-unplanned">
            {t('month.unplanned', {
              count: unplanned.count,
              amount: formatCurrency(unplanned.total),
            })}
          </Typography>
        </View>
      ) : null}
    </Card>
  );
}

/** The progress bar's fill colour for a pace level. */
function paceBarColor(pace: PaceLevel, c: ThemeColors): string {
  if (pace === 'red') return c.DANGER;
  if (pace === 'yellow') return c.WARNING;
  return c.SUCCESS;
}

/** One figure in the in/out/net row, with its caption above. */
function CashflowStat({ label, value }: { label: string; value: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.cashflowCol}>
      <Typography variant="muted">{label}</Typography>
      <AnimatedCounter value={value} style={styles.cashflowAmount} />
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
  incomeLine: {
    marginTop: SPACING.xs,
  },
  planLink: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
  },
  planLinkPressed: {
    opacity: 0.6,
  },
  planLinkText: {
    color: c.PRIMARY_TEXT,
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
  unplannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  unplannedDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: c.WARNING,
  },
  cashflowAmount: {
    color: c.TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
});
