import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';

import { TransferLogScreen } from './TransferLogScreen';

/**
 * Reads `?id=<number>` and opens the transfer form in edit mode (VS-43). Lives
 * in the feature so only features touch `expo-router` hooks, mirroring
 * `AccountDetailRoute`.
 */
export function TransferDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation('accounts');
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('errors.transferNotFound')}</Typography>
      </View>
    );
  }

  return <TransferLogScreen transferId={id} />;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
