import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { formatCurrency } from '@/utils/formatCurrency';

import { SpendingSparkline } from './SpendingSparkline';

interface TodaySpendingCardProps {
  /** Control mode leads with the budget hero, so today is a compact supporting row;
   * learning mode makes today the hero with its 7-day trend. */
  includeBudgetData: boolean;
  todaySpending: number;
  /** Recommended daily spend; drives the over/within-pace caption. null hides it. */
  dailyPace: number | null;
  spendingTrend: number[];
  /** Long-formatted current date for the control-mode subtitle. */
  today: string;
}

/**
 * Today's total spending. In control mode it's a compact row beneath the budget
 * hero, annotated with how today compares to the recommended daily pace. In
 * learning mode it's the hero figure with a 7-day spending sparkline.
 */
export function TodaySpendingCard({
  includeBudgetData,
  todaySpending,
  dailyPace,
  spendingTrend,
  today,
}: TodaySpendingCardProps) {
  const peak = Math.max(0, ...spendingTrend);
  const hasTrend = peak > 0;

  if (includeBudgetData) {
    const paceCaption =
      dailyPace !== null && dailyPace > 0
        ? todaySpending > dailyPace
          ? `Over your daily pace of ${formatCurrency(dailyPace)}`
          : `Within your daily pace of ${formatCurrency(dailyPace)}`
        : null;

    return (
      <Card testID="today-spending">
        <View style={styles.todayRow}>
          <View style={styles.todayLabel}>
            <Typography variant="label">Today's Spending</Typography>
            <Typography variant="muted" style={styles.todayDate}>
              {today}
            </Typography>
          </View>
          <AnimatedCounter value={todaySpending} variant="subheading" />
        </View>
        {paceCaption ? (
          <Typography variant="muted" style={styles.paceCaption}>
            {paceCaption}
          </Typography>
        ) : null}
      </Card>
    );
  }

  return (
    <Card testID="today-spending">
      <Typography variant="label">Spent today</Typography>
      <AnimatedCounter value={todaySpending} style={styles.heroAmount} />
      {hasTrend ? (
        <View style={styles.trend}>
          <SpendingSparkline values={spendingTrend} testID="spending-sparkline" />
          <Typography variant="muted" style={styles.trendCaption}>
            {`Last 7 days · peak ${formatCurrency(peak)}`}
          </Typography>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayLabel: {
    flex: 1,
  },
  todayDate: {
    marginTop: 2,
  },
  paceCaption: {
    marginTop: 8,
  },
  heroAmount: {
    fontSize: 34,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  trend: {
    marginTop: 16,
    gap: 6,
  },
  trendCaption: {
    fontSize: 11,
  },
});
