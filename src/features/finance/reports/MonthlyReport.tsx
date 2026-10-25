import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useIsBeforeStep } from '@/components/JourneyStageProvider';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { monthLabel } from '@/utils/monthMath';
import { NetWorthCard } from '@/features/finance/networth/NetWorthCard';

import { EstimateVsActualCard } from './EstimateVsActualCard';
import { NavArrows } from './NavArrows';
import { ReportGroup } from './ReportGroup';
import { ReportRow } from './ReportRow';
import { ReportSkeleton } from './ReportSkeleton';
import { ThisMonthSection } from './ThisMonthSection';
import { TypicalMonthCard } from './TypicalMonthCard';
import { useEstimatesForReport, useMonthlyReport, useSpendingProfile } from './reports.hooks';
import type { MonthlyReport as MonthlyReportData } from './reports.types';

/** A month with nothing logged: no income, no spending, no category. */
function isEmptyMonth(report: MonthlyReportData): boolean {
  return (
    report.incomeTotal === 0 &&
    report.expensePerformance.actual === 0 &&
    report.categoryBreakdown.length === 0
  );
}

/**
 * The Reports tab, in three groups that each answer one question (UX-14):
 *
 * 1. **This month** — scoped by the month stepper, which comes first: in and
 *    out, the month against its plan, why the money went, the categories and
 *    the biggest changes since last month.
 * 2. **Over time** — your typical month and your estimates, from complete
 *    months; open from the See step on.
 * 3. **Wealth** — net worth and the debt totals, as of today; open at Grow.
 *
 * The two later groups fold, defaulting by the journey step and remembering the
 * user's own choice on the phone. With the step unknown both are open, so
 * nothing hides. A link to the weekly report closes the page.
 */
export function MonthlyReport() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('reports');
  const {
    report,
    monthISO,
    loading,
    error,
    refresh: refreshReport,
    goToPrevMonth,
    goToNextMonth,
    isCurrentMonth,
  } = useMonthlyReport();
  // The typical month is not tied to the month being browsed; it is reloaded on
  // focus so a category re-tagged as fixed or variable shows on return (VS-41).
  const { profile, startingPoint, refresh: refreshProfile } = useSpendingProfile();
  const { baseline, refresh: refreshEstimates, accept } = useEstimatesForReport();
  const beforeSee = useIsBeforeStep('see');
  const beforeGrow = useIsBeforeStep('grow');

  useFocusEffect(
    useCallback(() => {
      refreshReport();
      void refreshProfile();
      void refreshEstimates();
    }, [refreshReport, refreshProfile, refreshEstimates]),
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NavArrows
        label={monthLabel(monthISO)}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
        nextDisabled={isCurrentMonth}
        testIDPrefix="month-nav"
      />

      <ReportGroup id="this-month" title={t('groups.thisMonth')}>
        {/* The shared states (UX-16): error with "Try again", skeleton on a
            first load, and an empty month that leads to where entries are added. */}
        {error ? (
          <ErrorState
            compact={report !== null}
            testID="report-error"
            title={t('errors.loadTitle')}
            message={error}
            onRetry={refreshReport}
          />
        ) : null}
        {loading && !report && !error ? <ReportSkeleton /> : null}
        {report && isEmptyMonth(report) ? (
          <EmptyState
            testID="report-empty"
            icon="reports"
            title={t('monthly.emptyTitle', { month: monthLabel(monthISO) })}
            subtitle={t('monthly.emptyHint')}
            actionLabel={t('monthly.emptyAction')}
            onAction={() => router.push('/transactions')}
          />
        ) : null}
        {report && !isEmptyMonth(report) ? <ThisMonthSection report={report} monthISO={monthISO} /> : null}
      </ReportGroup>

      {profile ? (
        <ReportGroup
          id="over-time"
          title={t('groups.overTime')}
          hint={t('groups.overTimeHint')}
          collapsible={{ prefKey: 'reports.group.overTime', defaultOpen: !beforeSee }}
        >
          <TypicalMonthCard profile={profile} startingPoint={startingPoint} />
          {baseline ? (
            <EstimateVsActualCard
              profile={profile}
              monthlyIncome={baseline.monthlyIncome}
              monthlyEssentials={baseline.monthlyEssentials}
              onAccept={(kind, value) => void accept(kind, value)}
            />
          ) : null}
        </ReportGroup>
      ) : null}

      <ReportGroup
        id="wealth"
        title={t('groups.wealth')}
        hint={t('groups.wealthHint')}
        collapsible={{ prefKey: 'reports.group.wealth', defaultOpen: !beforeGrow }}
      >
        <NetWorthCard />
        {/* Debt totals are not month-specific, so they sit here, as of today. */}
        {report ? (
          <View style={styles.section} testID="report-debt">
            <Typography variant="subheading">{t('monthly.debt')}</Typography>
            <ReportRow label={t('monthly.lentOut')} value={report.debtSummary.totalLent} />
            <ReportRow label={t('monthly.owed')} value={report.debtSummary.totalOwed} />
          </View>
        ) : null}
      </ReportGroup>

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
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 24 },
    section: { gap: 8 },
    weeklyLink: { paddingVertical: 12, alignItems: 'center' },
    weeklyLinkText: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
