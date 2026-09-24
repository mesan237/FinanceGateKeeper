import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { AddTransactionSheet } from '@/features/finance/expenses/AddTransactionSheet';
import { useZeroDay } from '@/features/finance/expenses/expenses.hooks';
import { formatDateLong } from '@/utils/formatDate';

import { MonthOverviewCard } from './MonthOverviewCard';
import { QuickActionBar } from './QuickActionBar';
import { TodaySpendingCard } from './TodaySpendingCard';
import { WalletsCard } from './WalletsCard';
import { useDashboard } from './dashboard.hooks';

/**
 * Home screen. Shows budget pace, fund balances, top active project, and
 * today's spending. Refreshes on every tab focus so numbers stay current.
 */
export function DashboardScreen() {
  const { state, loading, error, refresh } = useDashboard();
  const router = useRouter();
  const { status: zeroDayStatus, confirm: confirmZeroDay, refresh: refreshZeroDay } = useZeroDay();
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={c.PRIMARY_GREEN} />
        <Typography variant="muted" style={styles.loadingText}>
          Loading…
        </Typography>
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

        {/* Error card */}
        {error ? (
          <Card style={styles.errorCard}>
            <Typography style={styles.errorText}>{error}</Typography>
            <Pressable onPress={() => void refresh()} style={styles.retryButton}>
              <Typography style={styles.retryText}>Retry</Typography>
            </Pressable>
          </Card>
        ) : null}

        {/* The month at a glance: days left, what is left to spend against the
            budget, and the in/out/net of what has been logged. */}
        {state?.budget && state.cashflow ? (
          <MonthOverviewCard
            monthISO={state.monthISO}
            daysRemaining={state.daysRemaining}
            summary={state.budget}
            cashflow={state.cashflow}
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

        {/* Wallets — live balance per account (VS-18) */}
        <WalletsCard />



        {/* Today's spending — a compact supporting row beneath the budget hero,
            carrying the 7-day trend. */}
        <TodaySpendingCard
          todaySpending={state?.todaySpending ?? 0}
          dailyPace={state?.dailyPace ?? null}
          spendingTrend={state?.spendingTrend ?? []}
          today={today}
        />
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
  loadingContainer: {
    flex: 1,
    backgroundColor: c.BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 4,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  errorCard: {
    backgroundColor: c.DANGER_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: c.DANGER,
    flex: 1,
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: c.DANGER,
    marginLeft: 12,
  },
  retryText: {
    color: c.SURFACE,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    fontSize: 13,
  },
});
