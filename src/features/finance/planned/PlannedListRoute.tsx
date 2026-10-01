import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { PlannedListScreen } from './PlannedListScreen';

/**
 * Reads `?id=<number>` from the route's search params, validates it, and renders
 * `<PlannedListScreen>` with a typed prop. Lives in the slice (not in `app/`) so
 * the thin-route rule holds. A stray navigation renders a muted line, not a crash.
 */
export function PlannedListRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation('planned');
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('list.invalidId')}</Typography>
      </View>
    );
  }

  return <PlannedListScreen listId={id} />;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
