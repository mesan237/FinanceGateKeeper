import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { ICON_SIZE } from '@/constants/icons';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';

import { IncomeSourcePicker } from './IncomeSourcePicker';
import { useIncomeLog } from './income.hooks';

export interface IncomeEntryPanelProps {
  /**
   * Called after the income is saved, with the persisted amount and its month
   * (`YYYY-MM`) — captured before the hook resets the form. The caller routes to
   * the allocation flow or closes a sheet.
   */
  onSaved: (amount: number, month: string) => void;
}

/**
 * The income entry form body: amount, source pills, an optional note, and a date
 * defaulting to today. Shared between `IncomeLogScreen` and the unified
 * `AddTransactionSheet`.
 */
export function IncomeEntryPanel({ onSaved }: IncomeEntryPanelProps) {
  const log = useIncomeLog();
  const defaultAccountId = useDefaultAccountId();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (log.accountId === null && defaultAccountId !== null) log.setAccountId(defaultAccountId);
  }, [defaultAccountId, log.accountId]);

  const handleSave = async () => {
    // Capture before submit() — the hook resets the form on success.
    const persistedAmount = Math.trunc(Number(log.amount));
    const persistedMonth = log.date.slice(0, 7);

    setSaving(true);
    try {
      const id = await log.submit();
      if (id !== null) onSaved(persistedAmount, persistedMonth);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AmountInput value={log.amount} onChangeText={log.setAmount} autoFocus />

      <IncomeSourcePicker value={log.source} onChange={log.setSource} />

      <TextInput
        value={log.note}
        onChangeText={log.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
      />

      <DateField value={log.date} onChange={log.setDate} testID="income-date" />

      <AccountPicker
        testID="income-account"
        label="Account"
        value={log.accountId}
        onChange={log.setAccountId}
      />

      <Button label="Save" onPress={handleSave} disabled={!log.canSubmit} loading={saving} />

      {log.error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={ICON_SIZE.sm} color={DANGER} />
          <Typography style={styles.error}>{log.error}</Typography>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    color: DANGER,
  },
});
