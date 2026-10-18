import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { TontineDetail } from './TontineDetail';

/**
 * Reads `?id=<number>` and renders `<TontineDetail>` for that tontine. Lives in the
 * feature so only features touch `expo-router` hooks; a stray id renders a
 * muted line rather than a crash.
 */
export function TontineDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation('tontines');
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('detail.invalidId')}</Typography>
      </View>
    );
  }

  return <TontineDetail tontineId={id} />;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
