import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { FUND_TYPE_LABELS } from '@/constants/funds';
import { FundProgressBar } from '@/features/finance/funds/FundProgressBar';

import type { FundsSummary } from './dashboard.types';

interface FundStatusCardProps {
  funds: FundsSummary;
}

/**
 * Mini fund overview on the dashboard: emergency fund and savings stacked,
 * each showing its balance and progress bar (savings shows balance only when
 * no target is set).
 */
export function FundStatusCard({ funds }: FundStatusCardProps) {
  return (
    <Card testID="fund-status-card">
      <Typography variant="label">Funds</Typography>
      <View style={styles.list}>
        <View style={styles.row}>
          <Typography variant="muted">{FUND_TYPE_LABELS.emergency}</Typography>
          <FundProgressBar progress={funds.emergency} testID="fund-status-emergency" />
        </View>
        <View style={styles.row}>
          <Typography variant="muted">{FUND_TYPE_LABELS.savings}</Typography>
          <FundProgressBar progress={funds.savings} testID="fund-status-savings" />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    marginTop: 8,
  },
  row: {
    gap: 4,
  },
});
