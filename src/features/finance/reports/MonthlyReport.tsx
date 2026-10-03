import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import { colorForIndex } from './categoryColors';
import { MonthComparison } from './MonthComparison';
import { NavArrows } from './NavArrows';
import { OptimizationSuggestions } from './OptimizationSuggestions';
import { SpendingDonutChart } from './SpendingDonutChart';
import { UnplannedCard } from './UnplannedCard';
import { expenseSpentPct } from './reports.service';
import { useMonthlyReport } from './reports.hooks';

/**
 * The monthly report — the Reports tab root. Shows income vs expenses,
 * expense performance, the month's imprévus, a category pie chart and
 * breakdown, debt totals, an optional month-over-month comparison, and
 * rule-based suggestions. Prev/next arrows browse months; "next" is disabled
 * on the current month. A link navigates to the weekly report.
 */
export function MonthlyReport() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('reports');
  const { report, monthISO, loading, error, goToPrevMonth, goToNextMonth, isCurrentMonth } =
    useMonthlyReport();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NavArrows
        label={monthLabel(monthISO)}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
        nextDisabled={isCurrentMonth}
        testIDPrefix="month-nav"
      />

      {error ? <Typography variant="muted">{error}</Typography> : null}
      {loading && !report ? <Typography variant="muted">{t('loading')}</Typography> : null}

      {report ? (
        <>
          <Card>
            <View style={styles.summaryRow}>
              <View>
                <Typography variant="muted" style={styles.capLabel}>
                  {t('monthly.incomeCaps')}
                </Typography>
                <Typography variant="subheading">{formatCurrency(report.incomeTotal)}</Typography>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.alignEnd}>
                <Typography variant="muted" style={styles.capLabel}>
                  {t('monthly.expensesCaps')}
                </Typography>
                <Typography variant="subheading">
                  {formatCurrency(report.expensePerformance.actual)}
                </Typography>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <Typography variant="subheading">{t('monthly.performance')}</Typography>
            <PerfRow label={t('monthly.planned')} value={report.expensePerformance.planned} />
            <ProgressBar
              testID="expense-performance-bar"
              value={expenseSpentPct(
                report.expensePerformance.actual,
                report.expensePerformance.planned,
              )}
              color={c.TEXT_PRIMARY}
              trackColor={c.SUCCESS}
            />
            <PerfRow label={t('monthly.actual')} value={report.expensePerformance.actual} />
            <PerfRow
              label={t('monthly.remaining')}
              value={report.expensePerformance.remaining}
              color={report.expensePerformance.remaining < 0 ? c.DANGER : c.SUCCESS}
            />
          </View>

          <UnplannedCard summary={report.unplanned} />

          <View style={styles.section}>
            <Typography variant="subheading">{t('monthly.byCategory')}</Typography>
            <SpendingDonutChart data={report.categoryBreakdown} />
            {report.categoryBreakdown.map((cat, i) => {
              const emoji = getTransactionIcon('expense', cat.categoryLabel);
              const avatar = getCategoryAvatar(cat.categoryLabel);
              return (
                <View
                  key={cat.categoryId}
                  style={styles.categoryRow}
                  testID={`month-category-${cat.categoryId}`}
                >
                  <View style={[styles.dot, { backgroundColor: colorForIndex(i) }]} />
                  <View style={styles.categoryIcon}>
                    <Typography
                      testID={`report-category-icon-${cat.categoryId}`}
                      style={styles.categoryEmoji}
                    >
                      {emoji ?? avatar.letter}
                    </Typography>
                  </View>
                  <View style={styles.categoryLabelCol}>
                    <Typography variant="body">{displayCategoryName(cat.categoryLabel)}</Typography>
                    <Typography variant="muted">
                      {t('monthly.pctOfTotal', { percent: Math.round(cat.pct) })}
                    </Typography>
                  </View>
                  <Typography variant="body">{formatCurrency(cat.amount)}</Typography>
                </View>
              );
            })}
          </View>

          <View style={styles.section}>
            <Typography variant="subheading">{t('monthly.debt')}</Typography>
            <PerfRow label={t('monthly.lentOut')} value={report.debtSummary.totalLent} />
            <PerfRow label={t('monthly.owed')} value={report.debtSummary.totalOwed} />
          </View>

          {report.comparison ? <MonthComparison comparison={report.comparison} /> : null}

          <OptimizationSuggestions suggestions={report.suggestions} />

          <Pressable
            testID="view-weekly-link"
            accessibilityRole="button"
            onPress={() => router.push('/reports/weekly')}
            style={styles.weeklyLink}
          >
            <Typography variant="body" style={styles.weeklyLinkText}>
              {t('monthly.viewWeekly')}
            </Typography>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

/** A label + right-aligned currency value row used across the report sections. */
function PerfRow({ label, value, color }: { label: string; value: number; color?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Typography variant="body">{label}</Typography>
      <Typography variant="body" style={color ? { color } : undefined}>
        {formatCurrency(value)}
      </Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: c.BORDER },
  capLabel: { letterSpacing: 1, fontSize: 11 },
  alignEnd: { alignItems: 'flex-end' },
  section: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
    paddingVertical: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
    paddingVertical: 10,
  },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: c.SURFACE_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 16, lineHeight: 22 },
  categoryLabelCol: { flex: 1 },
  progressBlock: { gap: 4, paddingVertical: 4 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  weeklyLink: { paddingVertical: 12, alignItems: 'center' },
  weeklyLinkText: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
});
