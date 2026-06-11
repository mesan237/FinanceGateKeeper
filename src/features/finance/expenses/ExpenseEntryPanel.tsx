import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { ICON_SIZE } from '@/constants/icons';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';

import { CategoryPicker } from './CategoryPicker';
import { useExpenseLog } from './expenses.hooks';

export interface ExpenseEntryPanelProps {
  /** Called after the expense is successfully persisted. */
  onSaved: () => void;
}

/**
 * The expense entry form body: amount, category (via the modal picker), an
 * optional note, and a date defaulting to today. Runs the over-budget check
 * before saving. The caller decides what happens on success (navigate away or
 * close a sheet) via `onSaved` — used by both `ExpenseLogScreen` and the unified
 * `AddTransactionSheet`.
 */
export function ExpenseEntryPanel({ onSaved }: ExpenseEntryPanelProps) {
  const log = useExpenseLog();
  const { check } = useOverBudgetCheck();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [overage, setOverage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const persist = async () => {
    setSaving(true);
    try {
      const id = await log.submit();
      if (id !== null) onSaved();
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
      <AmountInput value={log.amount} onChangeText={log.setAmount} autoFocus />

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
      />

      <DateField value={log.date} onChange={log.setDate} testID="expense-date" />

      <Button label="Save" onPress={handleSave} disabled={!log.canSubmit} loading={saving} />

      {log.error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={ICON_SIZE.sm} color={DANGER} />
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
