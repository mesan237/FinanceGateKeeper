import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { SpendingSparkline } from './SpendingSparkline';
import type { BudgetSummary, PaceLevel } from './dashboard.types';

function paceConfigFor(
  c: ThemeColors,
): Record<PaceLevel, { bg: string; text: string; bar: string; label: string }> {
  return {
    green:  { bg: c.SUCCESS_LIGHT, text: c.SUCCESS_TEXT, bar: c.SUCCESS, label: 'On Track'    },
    yellow: { bg: c.WARNING_LIGHT, text: c.WARNING_TEXT, bar: c.WARNING, label: 'Watch Out'   },
    red:    { bg: c.DANGER_LIGHT,  text: c.DANGER_TEXT,  bar: c.DANGER,  label: 'Over Budget' },
  };
}

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  /** Per-day spending for the trend sparkline (oldest first), if available. */
  trend?: number[];
}

/**
 * The dashboard hero: remaining monthly budget as the single dominant figure,
 * the pace chip (On Track / Watch Out / Over Budget) directly beneath it, and
 * a 7-day spending sparkline grounding the number in its recent trend.
 */
export function BudgetSummaryCard({ summary, trend }: BudgetSummaryCardProps) {
  const styles = useThemedStyles(makeStyles);
  const pace = paceConfigFor(useTheme())[summary.pace];
  const peak = trend ? Math.max(0, ...trend) : 0;
  const hasTrend = peak > 0;

  return (
    <Card testID="budget-summary-card">
      <Typography variant="label">Remaining this month</Typography>
      <AnimatedCounter value={summary.expensesRemaining} style={styles.amount} />

      {/* Spent-of-budget context: a bar + caption so "remaining" reads against the whole. */}
      <ProgressBar
        value={summary.spentPct}
        color={pace.bar}
        animated
        testID="budget-progress"
        style={styles.bar}
      />
      <View style={styles.metaRow}>
        <Typography variant="muted">
          {`${formatCurrency(summary.expensesLogged)} of ${formatCurrency(summary.expenseBudget)} spent`}
        </Typography>
        <View
          testID="budget-pace-chip"
          style={[styles.chip, { backgroundColor: pace.bg }]}
        >
          <Typography style={[styles.chipText, { color: pace.text }]}>
            {pace.label}
          </Typography>
        </View>
      </View>

      {trend && hasTrend ? (
        <View style={styles.trend}>
          <SpendingSparkline values={trend} testID="spending-sparkline" />
          <Typography variant="muted" style={styles.trendCaption}>
            {`Last 7 days · peak ${formatCurrency(peak)}`}
          </Typography>
        </View>
      ) : null}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  amount: {
    color: c.TEXT_PRIMARY,
    fontSize: 34,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD,
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 12,
  },
  bar: {
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  trend: {
    marginTop: 16,
    gap: 6,
  },
  trendCaption: {
    fontSize: 11,
  },
});
