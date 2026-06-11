import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import {
  BACKGROUND,
  DANGER,
  DANGER_LIGHT,
  PRIMARY_GREEN,
  SURFACE,
} from '@/constants/colors';
import { useZeroDay } from '@/features/finance/expenses/expenses.hooks';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

import { BudgetSummaryCard } from './BudgetSummaryCard';
import { FundStatusCard } from './FundStatusCard';
import { QuickActionBar } from './QuickActionBar';
import { WalletsCard } from './WalletsCard';
import { useDashboard } from './dashboard.hooks';

interface DashboardScreenProps {
  /** True in control mode (budget/funds/project cards shown); false in learning mode. */
  includeBudgetData: boolean;
}

/**
 * Home screen. Shows budget pace, fund balances, top active project, and
 * today's spending. Refreshes on every tab focus so numbers stay current.
 */
export function DashboardScreen({ includeBudgetData }: DashboardScreenProps) {
  const { state, loading, error, refresh } = useDashboard({ includeBudgetData });
  const { status: zeroDayStatus, confirm: confirmZeroDay, refresh: refreshZeroDay } = useZeroDay();

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshZeroDay();
    }, [refresh, refreshZeroDay]),
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
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
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Typography variant="heading">Dashboard</Typography>
            <Typography variant="muted">{today}</Typography>
          </View>
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

        {/* Budget / funds / project (control mode only) */}
        {state?.budget ? <BudgetSummaryCard summary={state.budget} /> : null}

        {/* Wallets — live balance per account (VS-18) */}
        <WalletsCard />

        {state?.funds ? <FundStatusCard funds={state.funds} /> : null}

        {state?.topProject ? (
          <Card testID="top-project-card">
            <Typography variant="label">Top Project</Typography>
            <Typography variant="subheading" style={styles.projectName}>
              {state.topProject.project.name}
            </Typography>
            <Typography variant="muted">{`${state.topProject.pct}% funded`}</Typography>
          </Card>
        ) : null}

        {/* Today's spending */}
        <Card testID="today-spending">
          <View style={styles.todayRow}>
            <View>
              <Typography variant="label">Today's Spending</Typography>
              <Typography variant="muted" style={styles.todayDate}>
                {today}
              </Typography>
            </View>
            <Typography variant="display">
              {formatCurrency(state?.todaySpending ?? 0)}
            </Typography>
          </View>
        </Card>

        {/* Learning-mode empty state */}
        {!includeBudgetData ? (
          <Card style={styles.emptyCard}>
            <Typography variant="subheading" style={styles.emptyTitle}>
              Getting started
            </Typography>
            <Typography variant="muted">
              Log your first expense or income using the buttons below. Budget tracking unlocks in
              Control mode once you set your allocation.
            </Typography>
          </Card>
        ) : null}
      </ScrollView>

      {/* Sticky action bar — sits outside ScrollView so it never scrolls away */}
      <View style={styles.actionBarWrapper}>
        <QuickActionBar
          zeroDay={zeroDayStatus ?? { hasExpenses: false, zeroDayConfirmed: false }}
          onConfirmZeroDay={confirmZeroDay}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 8,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
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
    backgroundColor: DANGER_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: DANGER,
    flex: 1,
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: DANGER,
    marginLeft: 12,
  },
  retryText: {
    color: SURFACE,
    fontWeight: '600',
    fontSize: 13,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayDate: {
    marginTop: 2,
  },
  projectName: {
    marginTop: 4,
    marginBottom: 2,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    gap: 6,
  },
  emptyTitle: {
    marginBottom: 2,
  },
  actionBarWrapper: {
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
});
