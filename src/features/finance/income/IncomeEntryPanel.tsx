import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { ICON_SIZE } from '@/constants/icons';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';

import { IncomeSourcePicker } from './IncomeSourcePicker';
import { useIncomeLog, type ControlledField } from './income.hooks';

export interface IncomeEntryPanelProps {
  /**
   * Called after the income is saved, with the persisted amount, its month
   * (`YYYY-MM`), and the new row id — captured before the hook resets the form.
   * The caller routes to the allocation flow (passing the id so Confirm can mark
   * the row allocated) or closes a sheet.
   */
  onSaved: (amount: number, month: string, id: number) => void;
  /** Lift the amount to the parent so it survives the panel unmounting. */
  amount?: ControlledField;
  /** Lift the note to the parent so it survives the panel unmounting. */
  note?: ControlledField;
  /** Focus the amount field on mount. Default `true`. */
  autoFocus?: boolean;
}

/**
 * The income entry form body: amount, source pills, an optional note, and a date
 * defaulting to today. Shared between `IncomeLogScreen` and the unified
 * `AddTransactionSheet`.
 */
export function IncomeEntryPanel({
  onSaved,
  amount,
  note,
  autoFocus = true,
}: IncomeEntryPanelProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const log = useIncomeLog({ amount, note });
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
      if (id !== null) onSaved(persistedAmount, persistedMonth, id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AmountInput value={log.amount} onChangeText={log.setAmount} autoFocus={autoFocus} />

      <IncomeSourcePicker value={log.source} onChange={log.setSource} />

      <TextInput
        value={log.note}
        onChangeText={log.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        style={styles.note}
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
          <Icon name="alert" size={ICON_SIZE.sm} color={c.DANGER} />
          <Typography style={styles.error}>{log.error}</Typography>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 10,
  },
  note: {
    minHeight: 64,
    paddingTop: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    color: c.DANGER,
  },
});
