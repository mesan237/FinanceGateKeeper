import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { DebtDetail } from './DebtDetail';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<DebtDetail>` with a typed prop. Lives in the debt feature (not in `app/`) so
 * the thin-route rule holds — only features may import `expo-router`'s hooks. A
 * stray navigation renders a muted line, not a crash. Mirrors `ProjectDetailRoute`.
 */
export function DebtDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation('debt');
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('detail.invalidId')}</Typography>
      </View>
    );
  }

  return <DebtDetail debtId={id} />;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
