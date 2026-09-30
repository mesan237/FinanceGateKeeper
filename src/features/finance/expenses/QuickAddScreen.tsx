import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';

import { QuickAddGrid } from './QuickAddGrid';

/**
 * The Quick Add route: a header plus the shared `QuickAddGrid` of one-tap
 * template tiles. The grid is also embedded in the unified `AddTransactionSheet`.
 */
export function QuickAddScreen() {
  const { t } = useTranslation('expenses');
  return (
    <View style={styles.container}>
      <ScreenHeader title={t('quickAdd.title')} />
      <QuickAddGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
});
