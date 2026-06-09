import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import {
  DANGER,
  DANGER_LIGHT,
  SUCCESS,
  SUCCESS_LIGHT,
  WARNING,
  WARNING_LIGHT,
} from '@/constants/colors';
import { formatCurrency } from '@/utils/formatCurrency';

import type { BudgetSummary, PaceLevel } from './dashboard.types';

const PACE_CONFIG: Record<PaceLevel, { bg: string; text: string; label: string }> = {
  green:  { bg: SUCCESS_LIGHT,  text: SUCCESS,  label: 'On Track'    },
  yellow: { bg: WARNING_LIGHT,  text: WARNING,  label: 'Watch Out'   },
  red:    { bg: DANGER_LIGHT,   text: DANGER,   label: 'Over Budget' },
};

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
}

/**
 * Monthly expense budget card: remaining amount as the hero figure, plus a
 * labelled status chip (On Track / Watch Out / Over Budget).
 */
export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const pace = PACE_CONFIG[summary.pace];

  return (
    <Card testID="budget-summary-card">
      <View style={styles.row}>
        <View style={styles.text}>
          <Typography variant="label">Monthly Budget</Typography>
          <Typography variant="display" style={styles.amount}>
            {formatCurrency(summary.expensesRemaining)}
          </Typography>
          <Typography variant="muted">remaining this month</Typography>
        </View>
        <View
          testID="budget-pace-chip"
          style={[styles.chip, { backgroundColor: pace.bg }]}
        >
          <Typography style={[styles.chipText, { color: pace.text }]}>
            {pace.label}
          </Typography>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  amount: {
    marginTop: 4,
    marginBottom: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
