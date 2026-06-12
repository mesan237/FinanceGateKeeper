import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import {
  DANGER_LIGHT,
  DANGER_TEXT,
  SUCCESS_LIGHT,
  SUCCESS_TEXT,
  TEXT_PRIMARY,
  WARNING_LIGHT,
  WARNING_TEXT,
} from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';

import { SpendingSparkline } from './SpendingSparkline';
import type { BudgetSummary, PaceLevel } from './dashboard.types';

const PACE_CONFIG: Record<PaceLevel, { bg: string; text: string; label: string }> = {
  green:  { bg: SUCCESS_LIGHT,  text: SUCCESS_TEXT,  label: 'On Track'    },
  yellow: { bg: WARNING_LIGHT,  text: WARNING_TEXT,  label: 'Watch Out'   },
  red:    { bg: DANGER_LIGHT,   text: DANGER_TEXT,   label: 'Over Budget' },
};

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
  const pace = PACE_CONFIG[summary.pace];
  const hasTrend = trend !== undefined && trend.some((v) => v > 0);

  return (
    <Card testID="budget-summary-card">
      <Typography variant="label">Remaining this month</Typography>
      <Typography style={styles.amount}>{formatCurrency(summary.expensesRemaining)}</Typography>
      <View
        testID="budget-pace-chip"
        style={[styles.chip, { backgroundColor: pace.bg }]}
      >
        <Typography style={[styles.chipText, { color: pace.text }]}>
          {pace.label}
        </Typography>
      </View>

      {hasTrend ? (
        <View style={styles.trend}>
          <SpendingSparkline values={trend} testID="spending-sparkline" />
          <Typography variant="muted" style={styles.trendCaption}>
            Spending · last 7 days
          </Typography>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: TEXT_PRIMARY,
    fontSize: 34,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 10,
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
