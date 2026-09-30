import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { ScreenHeader } from '@/components/ScreenHeader';

import { IncomeEntryPanel } from './IncomeEntryPanel';

/**
 * Income entry route: a header plus the shared `IncomeEntryPanel`. On a
 * successful save it returns to Transactions — since VS-34 there is no
 * allocation step between logging income and it being recorded. The form body
 * lives in the panel, shared with the unified `AddTransactionSheet`. Wrapped in
 * `KeyboardAwareForm` so the account picker and Save button stay reachable once
 * the keyboard is up.
 */
export function IncomeLogScreen() {
  const router = useRouter();
  const { t } = useTranslation(['income', 'common']);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('log.title')} cancelLabel={t('common:actions.cancel')} />
      <KeyboardAwareForm>
        <IncomeEntryPanel onSaved={() => router.replace('/transactions')} />
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
