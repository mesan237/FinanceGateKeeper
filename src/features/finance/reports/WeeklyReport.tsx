import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { displayCategoryName } from '@/i18n/categoryNames';
import { dateNames } from '@/i18n/dateNames';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { NavArrows } from './NavArrows';
import { SpendingBarChart } from './SpendingBarChart';
import { useWeeklyReport } from './reports.hooks';

// The chart runs Monday to Sunday; `daysShort` is indexed from Sunday.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * The weekly pulse screen: total spent and income for the week, a daily
 * spending bar chart, and the top categories. Prev/next arrows browse weeks;
 * "next" is disabled on the current week.
 */
export function WeeklyReport() {
  const styles = useThemedStyles(makeStyles);
  const { report, loading, error, goToPrevWeek, goToNextWeek, isCurrentWeek } = useWeeklyReport();
  const { t } = useTranslation('reports');
  const days = dateNames();
  const dayLabels = WEEK_ORDER.map((i) => days.daysShort[i]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('weekly.title')} />
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
        {loading && !report ? <Typography variant="muted">{t('loading')}</Typography> : null}

        {report ? (
          <>
            <Card>
              <View style={styles.summaryRow}>
                <View>
                  <Typography variant="muted">{t('weekly.spent')}</Typography>
                  <Typography variant="subheading">{formatCurrency(report.totalSpent)}</Typography>
                </View>
                <View style={styles.alignEnd}>
                  <Typography variant="muted">{t('weekly.income')}</Typography>
                  <Typography variant="subheading">{formatCurrency(report.totalIncome)}</Typography>
                </View>
              </View>
              {report.peakDay ? (
                <Typography variant="muted" style={styles.peak}>
                  {t('weekly.highestDay', {
                    date: formatDateShort(report.peakDay.date),
                    amount: formatCurrency(report.peakDay.amount),
                  })}
                </Typography>
              ) : null}
            </Card>

            <SpendingBarChart
              labels={dayLabels}
              values={report.spendingByDay.map((d) => d.amount)}
            />

            <View style={styles.section}>
              <Typography variant="subheading">{t('weekly.topCategories')}</Typography>
              {report.topCategories.length === 0 ? (
                <Typography variant="muted">{t('weekly.empty')}</Typography>
              ) : (
                report.topCategories.map((c) => (
                  <View key={c.categoryId} style={styles.row} testID={`week-category-${c.categoryId}`}>
                    <Typography variant="body">{displayCategoryName(c.categoryLabel)}</Typography>
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
    borderBottomColor: c.BORDER,
    paddingVertical: 8,
  },
});
