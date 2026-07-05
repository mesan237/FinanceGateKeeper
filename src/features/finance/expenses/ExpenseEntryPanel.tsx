import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { ICON_SIZE } from '@/constants/icons';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';

import { formatCurrency } from '@/utils/formatCurrency';

import { CategoryPicker } from './CategoryPicker';
import { useExpenseLog, type ControlledField } from './expenses.hooks';

export interface ExpenseEntryPanelProps {
  /** Called after the expense is successfully persisted. */
  onSaved: () => void;
  /** Lift the amount to the parent so it survives the panel unmounting. */
  amount?: ControlledField;
  /** Lift the note to the parent so it survives the panel unmounting. */
  note?: ControlledField;
  /** Focus the amount field on mount. Default `true`. */
  autoFocus?: boolean;
}

/**
 * The expense entry form body: amount, category (via the modal picker), an
 * optional note, and a date defaulting to today. Runs the over-budget check
 * before saving. The caller decides what happens on success (navigate away or
 * close a sheet) via `onSaved` — used by both `ExpenseLogScreen` and the unified
 * `AddTransactionSheet`.
 */
export function ExpenseEntryPanel({
  onSaved,
  amount,
  note,
  autoFocus = true,
}: ExpenseEntryPanelProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const log = useExpenseLog({ amount, note });
  const { check } = useOverBudgetCheck();
  const { show } = useToast();
  const defaultAccountId = useDefaultAccountId();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [overage, setOverage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-select the default wallet once it resolves, unless the user already chose one.
  useEffect(() => {
    if (log.accountId === null && defaultAccountId !== null) log.setAccountId(defaultAccountId);
  }, [defaultAccountId, log.accountId]);

  const persist = async () => {
    setSaving(true);
    try {
      // Capture before submit — the hook resets its fields on success.
      const amountLabel = formatCurrency(Math.trunc(Number(log.amount)));
      const id = await log.submit();
      if (id !== null) {
        show(categoryLabel ? `Logged ${amountLabel} · ${categoryLabel}` : `Logged ${amountLabel}`);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const result = await check(Math.trunc(Number(log.amount)));
    if (result.isOver) {
      setOverage(result.overage);
      return;
    }
    await persist();
  };

  return (
    <View style={styles.container}>
      <AmountInput value={log.amount} onChangeText={log.setAmount} autoFocus={autoFocus} />

      <Button
        label={categoryLabel ?? 'Select category'}
        variant="secondary"
        onPress={() => setPickerVisible(true)}
      />

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

      <DateField value={log.date} onChange={log.setDate} testID="expense-date" />

      <AccountPicker
        testID="expense-account"
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

      <CategoryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selection) => {
          log.setCategoryId(selection.categoryId);
          log.setSubcategoryId(selection.subcategoryId);
          setCategoryLabel(selection.label);
          setPickerVisible(false);
        }}
      />

      <OverBudgetAlert
        visible={overage !== null}
        overage={overage ?? 0}
        onProceed={() => {
          setOverage(null);
          void persist();
        }}
        onCancel={() => setOverage(null)}
      />
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
