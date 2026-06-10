import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { FUND_TYPE_LABELS } from '@/constants/funds';

import { FundProgressBar } from './FundProgressBar';
import { useFunds } from './funds.hooks';
import type { Fund, FundProgress } from './funds.types';

/**
 * The Funds screen body: the emergency fund and savings stacked as cards, each
 * showing its balance and progress toward its target. Tapping a card opens its
 * detail. Loading/error states surface inline.
 */
export function FundsOverview() {
  const { funds, progress, loading, error } = useFunds();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Funds" />

      {loading ? (
        <Typography variant="muted">Loading…</Typography>
      ) : (
        funds.map((fund) => (
          <FundCard
            key={fund.id}
            fund={fund}
            progress={progress.find((p) => p.fundId === fund.id)}
          />
        ))
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

interface FundCardProps {
  fund: Fund;
  progress: FundProgress | undefined;
}

function FundCard({ fund, progress }: FundCardProps) {
  const router = useRouter();
  return (
    <Pressable testID={`fund-card-${fund.id}`} onPress={() => router.push(`/funds/${fund.id}`)}>
      <Card>
        <Typography variant="subheading">{FUND_TYPE_LABELS[fund.type]}</Typography>
        {progress ? (
          <FundProgressBar progress={progress} testID={`fund-progress-${fund.id}`} />
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  error: {
    color: DANGER,
  },
});
