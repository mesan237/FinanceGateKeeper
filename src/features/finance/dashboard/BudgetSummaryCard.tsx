import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { DANGER, SUCCESS, WARNING } from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';

import type { BudgetSummary, PaceLevel } from './dashboard.types';

const PACE_COLORS: Record<PaceLevel, string> = {
  green: SUCCESS,
  yellow: WARNING,
  red: DANGER,
};

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
}

/**
 * Displays the month's remaining expense budget with a pace-colour dot:
 * green (on track), yellow (75%+ with days left), red (over budget).
 */
export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  return (
    <Card testID="budget-summary-card">
      <View style={styles.row}>
        <View
          testID="budget-pace-dot"
          style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: PACE_COLORS[summary.pace] }}
        />
        <View style={styles.text}>
          <Typography variant="heading">{formatCurrency(summary.expensesRemaining)}</Typography>
          <Typography variant="muted">remaining this month</Typography>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    gap: 2,
  },
});
