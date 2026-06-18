import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { BORDER, DANGER, SUCCESS_TEXT, TEXT_PRIMARY } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';

import type { Cashflow } from './dashboard.types';

interface CashflowCardProps {
  cashflow: Cashflow;
}

/**
 * Month-to-date money in vs out. Three figures side by side — Income, Expenses,
 * and Net — so the user can read at a glance whether the month is running at a
 * surplus or a deficit. Net is coloured green when positive, danger when negative.
 */
export function CashflowCard({ cashflow }: CashflowCardProps) {
  const netColor = cashflow.net >= 0 ? SUCCESS_TEXT : DANGER;

  return (
    <Card testID="cashflow-card">
      <Typography variant="label">This month</Typography>
      <View style={styles.row}>
        <View style={styles.col}>
          <Typography variant="muted">In</Typography>
          <AnimatedCounter value={cashflow.income} style={styles.amount} />
        </View>
        <View style={styles.divider} />
        <View style={styles.col}>
          <Typography variant="muted">Out</Typography>
          <AnimatedCounter value={cashflow.expenses} style={styles.amount} />
        </View>
        <View style={styles.divider} />
        <View style={styles.col}>
          <Typography variant="muted">Net</Typography>
          <AnimatedCounter
            value={cashflow.net}
            style={[styles.amount, { color: netColor }]}
            testID="cashflow-net"
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  col: {
    flex: 1,
    gap: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: BORDER,
    marginHorizontal: 10,
  },
  amount: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: FONT_FAMILY.POPPINS_SEMIBOLD,
  },
});
