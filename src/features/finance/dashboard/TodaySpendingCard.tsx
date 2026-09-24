import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';

import { SpendingSparkline } from './SpendingSparkline';

interface TodaySpendingCardProps {
  todaySpending: number;
  /** Recommended daily spend; drives the over/within-pace caption. null hides it. */
  dailyPace: number | null;
  spendingTrend: number[];
  /** Long-formatted current date for the subtitle. */
  today: string;
}

/**
 * Today's total spending: a compact row beneath the budget hero, annotated with
 * how today compares to the recommended daily pace, over a 7-day sparkline.
 *
 * The card used to switch layouts on app mode — a hero figure with the trend in
 * learning mode, this compact row in control mode. With the mode gone (VS-34)
 * the budget hero always leads, so the compact row is the only layout; the
 * sparkline moved into it rather than being dropped, since the dashboard is
 * where the architecture puts the daily trend.
 */
export function TodaySpendingCard({
  todaySpending,
  dailyPace,
  spendingTrend,
  today,
}: TodaySpendingCardProps) {
  const peak = Math.max(0, ...spendingTrend);
  const hasTrend = peak > 0;

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
  trend: {
    marginTop: 16,
    gap: 6,
  },
  trendCaption: {
    fontSize: 11,
  },
});
