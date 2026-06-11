import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { AccountDetail } from './AccountDetail';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<AccountDetail>`. Lives in the feature (not in `app/`) so only features touch
 * `expo-router` hooks. Mirrors `DebtDetailRoute` / `ProjectDetailRoute`.
 */
export function AccountDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid account id.</Typography>
      </View>
    );
  }

  return <AccountDetail accountId={id} />;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
