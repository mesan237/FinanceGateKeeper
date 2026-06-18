import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';

import { QuickAddGrid } from './QuickAddGrid';

/**
 * The Quick Add route: a header plus the shared `QuickAddGrid` of one-tap
 * template tiles. The grid is also embedded in the unified `AddTransactionSheet`.
 */
export function QuickAddScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Quick Add" />
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
