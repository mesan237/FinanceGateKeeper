import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';

import { IncomeEntryPanel } from './IncomeEntryPanel';

/**
 * Income entry route: a header plus the shared `IncomeEntryPanel`. On a
 * successful save it navigates to `/income/allocate` so the user can confirm the
 * allocation breakdown — the canonical log → allocate → confirm → dashboard
 * flow. The form body lives in the panel, shared with the unified
 * `AddTransactionSheet`.
 */
export function IncomeLogScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Log Income" cancelLabel="Cancel" />
      <IncomeEntryPanel
        onSaved={(amount, month, id) =>
          router.push({
            pathname: '/income/allocate',
            params: { amount: String(amount), month, incomeId: String(id) },
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});
