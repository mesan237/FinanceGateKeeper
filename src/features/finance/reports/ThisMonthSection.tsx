import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { WhyBreakdown } from '@/components/WhyBreakdown';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { RADIUS } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { colorForCategory } from './categoryColors';
import { MonthComparison } from './MonthComparison';
import { ReportRow } from './ReportRow';
import { UnplannedSummary } from './UnplannedSummary';
import { expenseSpentPct } from './reports.service';
import { topCategoriesShare } from './reports.summary';
import type { MonthlyReport } from './reports.types';

export interface ThisMonthSectionProps {
  report: MonthlyReport;
  monthISO: string;
}

/**
 * Reports' "This month" group (UX-14), everything the month stepper scopes: in
 * and out, a one-sentence conclusion, the month against its plan, why the money
 * went (with the imprévus at its foot), the categories as ranked bars — each
 * opens its detail by path (VS-56) — and the biggest changes since last month.
 */
export function ThisMonthSection({ report, monthISO }: ThisMonthSectionProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('reports');
  const top = topCategoriesShare(report.categoryBreakdown);
  const openCategory = (categoryId: number) =>
    router.push({ pathname: '/budget/category/[id]', params: { id: String(categoryId), month: monthISO } });

  return (
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
            <Typography variant="subheading">{formatCurrency(report.expensePerformance.actual)}</Typography>
          </View>
        </View>
        {top ? (
          <Typography variant="muted" style={styles.sentence} testID="report-summary">
            {top.labels.length === 1
              ? t('summary.one', { first: displayCategoryName(top.labels[0]), percent: top.sharePct })
              : t('summary.two', {
                  first: displayCategoryName(top.labels[0]),
                  second: displayCategoryName(top.labels[1]),
                  percent: top.sharePct,
                })}
          </Typography>
        ) : null}
      </Card>

      <View style={styles.section}>
        <Typography variant="subheading">{t('monthly.performance')}</Typography>
        <ReportRow label={t('monthly.budget')} value={report.expensePerformance.planned} />
        <ProgressBar
          testID="expense-performance-bar"
          value={expenseSpentPct(report.expensePerformance.actual, report.expensePerformance.planned)}
          color={report.expensePerformance.remaining < 0 ? c.DANGER : c.SUCCESS}
        />
        <ReportRow label={t('monthly.actual')} value={report.expensePerformance.actual} />
        <ReportRow
          label={t('monthly.remaining')}
          value={report.expensePerformance.remaining}
          color={report.expensePerformance.remaining < 0 ? c.DANGER : c.SUCCESS}
        />
      </View>

      {/* Why the month went (VS-62); an event opens its page, by path. */}
      <WhyBreakdown
        totals={report.why.totals}
        events={report.why.events}
        onOpenEvent={(id) => router.push(`/events/${id}`)}
        footer={<UnplannedSummary summary={report.unplanned} />}
      />

      <View style={styles.section}>
        <Typography variant="subheading">{t('monthly.byCategory')}</Typography>
        {report.categoryBreakdown.map((cat) => {
          const emoji = getTransactionIcon('expense', cat.categoryLabel);
          const avatar = getCategoryAvatar(cat.categoryLabel);
          return (
            <Pressable
              key={cat.categoryId}
              accessibilityRole="button"
              onPress={() => openCategory(cat.categoryId)}
              style={styles.categoryRow}
              testID={`month-category-${cat.categoryId}`}
            >
              <View style={styles.categoryIcon}>
                <Typography testID={`report-category-icon-${cat.categoryId}`} style={styles.categoryEmoji}>
                  {emoji ?? avatar.letter}
                </Typography>
              </View>
              <View style={styles.categoryLabelCol}>
                <View style={styles.categoryLine}>
                  <Typography variant="body" style={styles.grow}>
                    {displayCategoryName(cat.categoryLabel)}
                  </Typography>
                  <Typography variant="body">{formatCurrency(cat.amount)}</Typography>
                </View>
                {/* Length, not angle: the ranked bar replaced the donut (UX-14). */}
                <View style={styles.track}>
                  <View
                    testID={`report-category-bar-${cat.categoryId}`}
                    style={[styles.fill, { width: `${Math.min(100, cat.pct)}%`, backgroundColor: colorForCategory(cat.categoryId) }]}
                  />
                </View>
                <Typography variant="muted">{t('monthly.pctOfTotal', { percent: Math.round(cat.pct) })}</Typography>
              </View>
            </Pressable>
          );
        })}
      </View>

      {report.comparison ? <MonthComparison comparison={report.comparison} /> : null}
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: c.BORDER },
    capLabel: { letterSpacing: 1, fontSize: 11 },
    alignEnd: { alignItems: 'flex-end' },
    sentence: { marginTop: 12 },
    section: { gap: 8 },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.BORDER,
      paddingVertical: 10,
    },
    categoryIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.md,
      backgroundColor: c.SURFACE_MUTED,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryEmoji: { fontSize: 16, lineHeight: 22 },
    categoryLabelCol: { flex: 1, gap: 4 },
    categoryLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    grow: { flex: 1 },
    track: { height: 6, borderRadius: RADIUS.full, backgroundColor: c.SURFACE_MUTED, overflow: 'hidden' },
    fill: { height: 6, borderRadius: RADIUS.full },
  });
