import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Pill, type PillTone } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import type { UnplannedTotals } from '@/features/finance/expenses/expenses.types';

import { MonthDetailsSheet } from './MonthDetailsSheet';
import { HeroNoteLine, PlanLeftLine } from './MonthOverviewLead';
import type { HeroLead } from './dashboard.heroLead';
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
  /** The month's imprévus; the details sheet names them only when there are some. */
  unplanned?: UnplannedTotals;
  /** Invoked by the "Plan a budget" link. The screen owns the navigation. */
  onSetBudget: () => void;
  /** What the journey step leads with (UX-24); omitted, the plan alone decides. */
  lead?: HeroLead;
}

/**
 * The dashboard's headline card: which month it is and how much of it is left,
 * then one figure that answers "where do I stand?".
 *
 *  - With a plan: what is left in it, paced on a bar with a status word.
 *  - Without one, the figure is what was spent so far, with how many days are
 *    logged (UX-04). Income received alone is not a plan, whatever it sizes
 *    behind the scenes, and the path starts by observing, so no limit is shown
 *    and no pace is judged. Planning stays one quiet link away.
 *  - While observing (`lead.spentView`), the spent view leads even with a
 *    plan, and the plan shows as one line under it (UX-24). The step may add a
 *    note: the typical month on See, variable spending vs the start on Optimize.
 *
 * Money in and out and the month's imprévus wait behind "Details", in a sheet
 * (VS-94): the card answers one question with one figure.
 */
export function MonthOverviewCard({
  monthISO,
  daysRemaining,
  summary,
  cashflow,
  logging,
  unplanned,
  onSetBudget,
  lead,
}: MonthOverviewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('dashboard');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasPlan = summary.isPlanned;
  const planned = hasPlan && !lead?.spentView;
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
        style={styles.amount}
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
        </>
      ) : (
        <>
          <Typography variant="muted" testID="month-overview-logging">
            {t('month.daysLogged', { logged: logging.loggedDays, count: logging.daysSoFar })}
          </Typography>
          {hasPlan ? <PlanLeftLine summary={summary} /> : null}
        </>
      )}

      {lead?.note ? <HeroNoteLine note={lead.note} /> : null}

      {/* The status on the left (the pace, or planning one quiet tap away);
          the way into the details on the right (VS-94). */}
      <View style={styles.footer}>
        {planned ? (
          <Pill label={pace.label} tone={pace.tone} testID="budget-pace-chip" />
        ) : !hasPlan ? (
          <Pressable
            testID="month-overview-set-budget"
            accessibilityRole="button"
            onPress={onSetBudget}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.linkPressed}
          >
            <Typography style={styles.linkText}>{t('month.planLink')}</Typography>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          testID="month-overview-details"
          accessibilityRole="button"
          onPress={() => setDetailsOpen(true)}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.linkPressed}
        >
          <Typography style={styles.linkText}>{t('month.details')}</Typography>
        </Pressable>
      </View>

      <MonthDetailsSheet
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        monthName={monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        cashflow={cashflow}
        unplanned={unplanned}
      />
    </Card>
  );
}

/** The progress bar's fill colour for a pace level. */
function paceBarColor(pace: PaceLevel, c: ThemeColors): string {
  if (pace === 'red') return c.DANGER;
  if (pace === 'yellow') return c.WARNING;
  return c.SUCCESS;
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
  bar: {
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    color: c.PRIMARY_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
