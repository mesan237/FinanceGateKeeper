import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { useJourneyFigures, useJourneyStage } from '@/components/JourneyStageProvider';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { AddTransactionSheet } from '@/features/finance/expenses/AddTransactionSheet';
import { useZeroDay } from '@/features/finance/expenses/expenses.hooks';
import { JourneyCard } from '@/features/finance/journey/JourneyCard';
import { formatDateLong } from '@/utils/formatDate';

import { DashboardSkeleton } from './DashboardSkeleton';
import { MonthOverviewCard } from './MonthOverviewCard';
import { heroLead } from './dashboard.heroLead';
import { NextForYouCard } from './NextForYouCard';
import { QuickActionBar } from './QuickActionBar';
import { TodaySpendingCard } from './TodaySpendingCard';
import { WalletsCard } from './WalletsCard';
import { useDashboard } from './dashboard.hooks';

/**
 * Home screen. Shows where the month stands (the plan, or what was spent and
 * how many days are logged), quick log, the path, wallets and today's
 * spending. Refreshes on every tab focus so numbers stay current.
 */
export function DashboardScreen() {
  const { state, loading, error, refresh } = useDashboard();
  const router = useRouter();
  const { status: zeroDayStatus, confirm: confirmZeroDay, refresh: refreshZeroDay } = useZeroDay();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('dashboard');
  // What the hero leads with follows the journey step (UX-24).
  const stage = useJourneyStage();
  const figures = useJourneyFigures();

  // The dashboard opens the same add-transaction sheet the Transactions FAB
  // uses (VS-26) rather than pushing standalone log routes.
  const [sheet, setSheet] = useState<{ open: boolean; segment: 'expense' | 'income' }>({
    open: false,
    segment: 'expense',
  });

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshZeroDay();
    }, [refresh, refreshZeroDay]),
  );

  // Only a cold load shows the skeleton: a focus refresh keeps the figures on
  // screen instead of blanking Home every time the tab comes back (UX-16).
  if (loading && !state && !error) {
    return (
      <View style={styles.root}>
        <DashboardSkeleton />
      </View>
    );
  }

  const today = formatDateLong(new Date());

  return (
    <View style={styles.root}>
      <ScrollView
        testID="dashboard-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* The native tab header already titles the screen — only the date
            lives in the content. */}
        <View style={styles.header}>
          <Typography variant="muted">{today}</Typography>
        </View>

        {/* The shared error card (UX-16); quick log below still works. */}
        {error ? (
          <ErrorState
            compact
            testID="dashboard-error"
            title={t('errors.loadTitle')}
            message={error}
            onRetry={() => void refresh()}
          />
        ) : null}

        {/* The month at a glance: days left, what is left to spend against the
            budget, and the in/out/net of what has been logged. */}
        {state?.budget && state.cashflow ? (
          <MonthOverviewCard
            monthISO={state.monthISO}
            daysRemaining={state.daysRemaining}
            summary={state.budget}
            cashflow={state.cashflow}
            logging={state.logging}
            unplanned={state.unplanned}
            lead={heroLead(stage, state.budget.isPlanned, figures)}
            onSetBudget={() =>
              router.push({ pathname: '/budget/plan', params: { month: state.monthISO } })
            }
          />
        ) : null}

        {/* Quick log — the daily loop's entry point, directly under the budget
            hero so it is the first thing in reach after reading the pace. */}
        <QuickActionBar
          zeroDay={zeroDayStatus ?? { hasExpenses: false, zeroDayConfirmed: false }}
          onConfirmZeroDay={confirmZeroDay}
          onLogExpense={() => setSheet({ open: true, segment: 'expense' })}
          onLogIncome={() => setSheet({ open: true, segment: 'income' })}
        />

        {/* What is due before month end, most urgent first; with nothing due,
            the journey step leads. It replaced the planned-purchases card. */}
        <NextForYouCard />

        {/* Where the user is on the path to control (VS-63); the setup
            checklist moved onto the path itself. */}
        <JourneyCard />


        {/* Wallets — live balance per account (VS-18) */}
        <WalletsCard />

        {/* Today's spending — a compact supporting row beneath the budget hero,
            carrying the 7-day trend. Hidden rather than showing a false 0 when
            the month could not load. */}
        {state ? (
          <TodaySpendingCard
            todaySpending={state.todaySpending}
            safeDailySpend={state.safeDailySpend}
            spendingTrend={state.spendingTrend}
            today={today}
          />
        ) : null}
      </ScrollView>

      {/* Unified add-transaction sheet — shared with the Transactions FAB (VS-26).
          An expense/template log refreshes the aggregates in place; an income log
          continues to the allocation flow via the sheet's own handler. */}
      <AddTransactionSheet
        visible={sheet.open}
        initialSegment={sheet.segment}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={() => void refresh()}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 4,
  },
});
