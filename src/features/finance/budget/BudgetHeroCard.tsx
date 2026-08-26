import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { healthDisplay } from './budgetHealthDisplay';
import type { BudgetOverview } from './budget.types';

export interface BudgetHeroCardProps {
  overview: BudgetOverview;
}

/**
 * The Budget tab's headline: what is left, how that compares to the pace the
 * month can absorb, and where the month is heading.
 *
 * Three deliberate choices:
 *
 *  - The bar carries a **pace marker** at the even-spend position, so it answers
 *    "am I ahead or behind?" rather than only "how much is gone?". A bar at 60%
 *    means nothing without knowing whether today is the 10th or the 25th.
 *  - The status is a **word** in a tinted chip, not just a bar colour — colour
 *    alone is unreadable for a colour-blind user (UX audit L5).
 *  - The projection sits alongside the remainder, because "on this pace you will
 *    finish at 310,000" is the sentence that changes behaviour mid-month.
 */
export function BudgetHeroCard({ overview }: BudgetHeroCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const status = healthDisplay(overview.health, c);
  const isOver = overview.remaining < 0;

  return (
    <Card testID="budget-hero">
      <View style={styles.headerRow}>
        <Typography variant="label">
          {isOver ? 'Over budget by' : 'Left to spend'}
        </Typography>
        <Pill label={status.label} tone={status.tone} testID="budget-health-chip" />
      </View>

      <AnimatedCounter
        value={Math.abs(overview.remaining)}
        style={[styles.amount, isOver && styles.amountOver]}
        testID="budget-remaining"
      />

      <ProgressBar
        testID="budget-meter"
        value={Math.min(100, overview.consumedPct)}
        marker={overview.available > 0 ? (overview.expectedToDate / overview.available) * 100 : undefined}
        color={status.color}
        animated
        style={styles.meter}
      />

      <View style={styles.captionRow}>
        <Typography variant="muted">
          {`${formatCurrency(overview.spent)} of ${formatCurrency(overview.available)} spent`}
        </Typography>
        <Typography variant="muted">{`${Math.round(overview.consumedPct)}%`}</Typography>
      </View>

      {overview.totalCarried !== 0 ? (
        <Typography variant="muted" style={styles.carried} testID="budget-carried">
          {`Includes ${formatCurrency(overview.totalCarried)} carried over from last month.`}
        </Typography>
      ) : null}

      <View style={styles.stats}>
        <Stat
          label="Days left"
          value={String(overview.daysRemaining)}
          testID="budget-stat-days"
        />
        <Stat
          label="Safe daily spend"
          value={formatCurrency(Math.round(overview.safeDailySpend))}
          testID="budget-stat-daily"
        />
        <Stat
          label="On this pace"
          value={formatCurrency(Math.round(overview.projected))}
          emphasis={overview.projected > overview.available}
          testID="budget-stat-projected"
        />
      </View>
    </Card>
  );
}

interface StatProps {
  label: string;
  value: string;
  /** Tints the figure when it is the one carrying bad news. */
  emphasis?: boolean;
  testID: string;
}

/** One figure in the hero's stat row, with its caption beneath. */
function Stat({ label, value, emphasis, testID }: StatProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat} testID={testID}>
      <Typography style={[styles.statValue, emphasis && styles.statValueAlert]}>
        {value}
      </Typography>
      <Typography variant="muted" style={styles.statLabel}>
        {label}
      </Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
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
  meter: {
    marginBottom: SPACING.sm,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  carried: {
    marginTop: SPACING.sm,
  },
  stats: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    color: c.TEXT_PRIMARY,
    fontSize: 15,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
  statValueAlert: {
    color: c.DANGER,
  },
  statLabel: {
    fontSize: 11,
  },
});
