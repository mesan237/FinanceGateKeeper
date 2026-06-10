import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { BORDER } from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { NavArrows } from './NavArrows';
import { SpendingBarChart } from './SpendingBarChart';
import { useWeeklyReport } from './reports.hooks';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The weekly pulse screen: total spent and income for the week, a daily
 * spending bar chart, and the top categories. Prev/next arrows browse weeks;
 * "next" is disabled on the current week.
 */
export function WeeklyReport() {
  const { report, loading, error, goToPrevWeek, goToNextWeek, isCurrentWeek } = useWeeklyReport();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Weekly Report" />
      <ScrollView contentContainerStyle={styles.content}>
        <NavArrows
          label={
            report
              ? `${formatDateShort(report.weekStart)} – ${formatDateShort(report.weekEnd)} ${report.weekEnd.slice(0, 4)}`
              : '…'
          }
          onPrev={goToPrevWeek}
          onNext={goToNextWeek}
          nextDisabled={isCurrentWeek}
          testIDPrefix="week-nav"
        />

        {error ? <Typography variant="muted">{error}</Typography> : null}
        {loading && !report ? <Typography variant="muted">Loading…</Typography> : null}

        {report ? (
          <>
            <Card>
              <View style={styles.summaryRow}>
                <View>
                  <Typography variant="muted">Spent</Typography>
                  <Typography variant="subheading">{formatCurrency(report.totalSpent)}</Typography>
                </View>
                <View style={styles.alignEnd}>
                  <Typography variant="muted">Income</Typography>
                  <Typography variant="subheading">{formatCurrency(report.totalIncome)}</Typography>
                </View>
              </View>
              {report.peakDay ? (
                <Typography variant="muted" style={styles.peak}>
                  Highest day: {formatDateShort(report.peakDay.date)} ·{' '}
                  {formatCurrency(report.peakDay.amount)}
                </Typography>
              ) : null}
            </Card>

            <SpendingBarChart
              labels={DAY_LABELS}
              values={report.spendingByDay.map((d) => d.amount)}
            />

            <View style={styles.section}>
              <Typography variant="subheading">Top Categories</Typography>
              {report.topCategories.length === 0 ? (
                <Typography variant="muted">No spending this week.</Typography>
              ) : (
                report.topCategories.map((c) => (
                  <View key={c.categoryId} style={styles.row} testID={`week-category-${c.categoryId}`}>
                    <Typography variant="body">{c.categoryLabel}</Typography>
                    <View style={styles.alignEnd}>
                      <Typography variant="body">{formatCurrency(c.amount)}</Typography>
                      <Typography variant="muted">{Math.round(c.pct)}%</Typography>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  alignEnd: { alignItems: 'flex-end' },
  peak: { marginTop: 12 },
  section: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingVertical: 8,
  },
});
