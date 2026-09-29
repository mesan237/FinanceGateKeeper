import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { ScreenHeader } from '@/components/ScreenHeader';

import { ExpenseEntryPanel } from './ExpenseEntryPanel';

/**
 * Manual expense entry route: a header plus the shared `ExpenseEntryPanel`. On a
 * successful save it returns to the transactions tab. The form body itself lives
 * in the panel, shared with the unified `AddTransactionSheet`. Wrapped in
 * `KeyboardAwareForm` so the account picker and Save button stay reachable
 * once the keyboard is up.
 */
export function ExpenseLogScreen() {
  const router = useRouter();
  const { t } = useTranslation(['expenses', 'common']);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('log.title')} cancelLabel={t('common:actions.cancel')} />
      <KeyboardAwareForm>
        <ExpenseEntryPanel onSaved={() => router.replace('/transactions')} />
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
