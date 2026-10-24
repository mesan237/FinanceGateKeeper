import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';

import { SpendingSparkline } from './SpendingSparkline';

interface TodaySpendingCardProps {
  todaySpending: number;
  /** The Budget tab's per-day figure (UX-11). null, for a month without a plan, hides it. */
  safeDailySpend: number | null;
  spendingTrend: number[];
  /** Long-formatted current date for the subtitle. */
  today: string;
}

/**
 * Today's total spending: a compact row beneath the budget hero, with the
 * Budget tab's "A day to stay on plan" figure, over a 7-day sparkline.
 *
 * The card used to switch layouts on app mode — a hero figure with the trend in
 * learning mode, this compact row in control mode. With the mode gone (VS-34)
 * the budget hero always leads, so the compact row is the only layout; the
 * sparkline moved into it rather than being dropped, since the dashboard is
 * where the architecture puts the daily trend.
 *
 * The daily figure is the Budget tab's `safeDailySpend`, rounded the same way,
 * so Home and Budget never show two different amounts a day (UX-11). It
 * replaced an even budget ÷ days-in-month pace that ignored what was spent.
 */
export function TodaySpendingCard({
  todaySpending,
  safeDailySpend,
  spendingTrend,
  today,
}: TodaySpendingCardProps) {
  const { t } = useTranslation('dashboard');
  const peak = Math.max(0, ...spendingTrend);
  const hasTrend = peak > 0;

  const perDayCaption =
    safeDailySpend !== null
      ? t('today.perDayOnPlan', { amount: formatCurrency(Math.round(safeDailySpend)) })
      : null;

  return (
    <Card testID="today-spending">
      <View style={styles.todayRow}>
        <View style={styles.todayLabel}>
          <Typography variant="label">{t('today.title')}</Typography>
          <Typography variant="muted" style={styles.todayDate}>
            {today}
          </Typography>
        </View>
        <AnimatedCounter value={todaySpending} variant="subheading" />
      </View>
      {perDayCaption ? (
        <Typography variant="muted" style={styles.perDayCaption} testID="today-per-day">
          {perDayCaption}
        </Typography>
      ) : null}
      {hasTrend ? (
        <View style={styles.trend}>
          <SpendingSparkline values={spendingTrend} testID="spending-sparkline" />
          <Typography variant="muted" style={styles.trendCaption}>
            {t('today.trend', { amount: formatCurrency(peak) })}
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
  perDayCaption: {
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
