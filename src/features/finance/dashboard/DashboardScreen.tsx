import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { useZeroDay } from '@/features/finance/expenses/expenses.hooks';
import { formatCurrency } from '@/utils/formatCurrency';

import { BudgetSummaryCard } from './BudgetSummaryCard';
import { FundStatusCard } from './FundStatusCard';
import { QuickActionBar } from './QuickActionBar';
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
      <View style={styles.container}>
        <Typography variant="muted">Loading…</Typography>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Typography variant="heading">Dashboard</Typography>

      {state?.budget ? <BudgetSummaryCard summary={state.budget} /> : null}

      {state?.funds ? <FundStatusCard funds={state.funds} /> : null}

      {state?.topProject ? (
        <Card testID="top-project-card">
          <Typography variant="subheading">{state.topProject.project.name}</Typography>
          <Typography variant="muted">{`${state.topProject.pct}% funded`}</Typography>
        </Card>
      ) : null}

      <Card testID="today-spending">
        <View style={styles.todayRow}>
          <Typography variant="subheading">Today</Typography>
          <Typography>{formatCurrency(state?.todaySpending ?? 0)}</Typography>
        </View>
      </Card>

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <QuickActionBar
        zeroDay={zeroDayStatus ?? { hasExpenses: false, zeroDayConfirmed: false }}
        onConfirmZeroDay={confirmZeroDay}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    color: DANGER,
  },
});
