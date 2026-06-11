import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';

import { IncomeSourcePicker } from './IncomeSourcePicker';
import { useIncomeLog } from './income.hooks';

/**
 * Income entry form: amount, source pills, optional note, date defaulting to
 * today. On a successful save, navigates to `/income/allocate` so the user
 * can confirm the allocation breakdown for the new income. The inline recent-
 * income list that lived here under VS-05 was removed in VS-06 — the canonical
 * flow is now log → allocate → confirm → dashboard. A dedicated history
 * surface will land later (VS-14 reports or a polish slice).
 */
export function IncomeLogScreen() {
  const router = useRouter();
  const log = useIncomeLog();

  const handleSave = async () => {
    // Capture before submit() because the hook's reset-on-success will wipe
    // the form. Validation is duplicated by `useIncomeLog`; if submit returns
    // null we never reach the navigation.
    const persistedAmount = Math.trunc(Number(log.amount));
    const persistedMonth = log.date.slice(0, 7);

    const id = await log.submit();
    if (id !== null) {
      router.push({
        pathname: '/income/allocate',
        params: { amount: String(persistedAmount), month: persistedMonth },
      });
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Log Income" cancelLabel="Cancel" />

      <TextInput
        value={log.amount}
        onChangeText={log.setAmount}
        placeholder="Amount (FCFA)"
        keyboardType="numeric"
        accessibilityLabel="Amount"
      />

      <IncomeSourcePicker value={log.source} onChange={log.setSource} />

      <TextInput
        value={log.note}
        onChangeText={log.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
      />

      <TextInput
        value={log.date}
        onChangeText={log.setDate}
        placeholder="YYYY-MM-DD"
        accessibilityLabel="Date"
      />

      <Button label="Save" onPress={handleSave} disabled={!log.canSubmit} />

      {log.error ? <Typography style={styles.error}>{log.error}</Typography> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  error: {
    color: DANGER,
  },
});
