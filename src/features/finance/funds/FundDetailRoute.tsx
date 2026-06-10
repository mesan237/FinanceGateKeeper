import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { FundDetail } from './FundDetail';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<FundDetail>` with a typed prop. Lives in the funds feature (not in `app/`)
 * so the thin-route rule holds — only features may import `expo-router`'s hooks.
 * A stray navigation (missing/malformed id) renders a muted line, not a crash.
 * Mirrors `AllocationFromIncomeRoute`.
 */
export function FundDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid fund id.</Typography>
      </View>
    );
  }

  return <FundDetail fundId={id} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
