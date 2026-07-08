import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { ScreenHeader } from '@/components/ScreenHeader';

import { IncomeEntryPanel } from './IncomeEntryPanel';

/**
 * Income entry route: a header plus the shared `IncomeEntryPanel`. On a
 * successful save it navigates to `/income/allocate` so the user can confirm the
 * allocation breakdown — the canonical log → allocate → confirm → dashboard
 * flow. The form body lives in the panel, shared with the unified
 * `AddTransactionSheet`. Wrapped in `KeyboardAwareForm` so the account picker
 * and Save button stay reachable once the keyboard is up.
 */
export function IncomeLogScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Log Income" cancelLabel="Cancel" />
      <KeyboardAwareForm>
        <IncomeEntryPanel
          onSaved={(amount, month, id) =>
            router.push({
              pathname: '/income/allocate',
              params: { amount: String(amount), month, incomeId: String(id) },
            })
          }
        />
      </KeyboardAwareForm>
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
