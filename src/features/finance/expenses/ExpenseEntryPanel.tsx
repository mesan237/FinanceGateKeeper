import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { ICON_SIZE } from '@/constants/icons';
import { RADIUS } from '@/constants/layout';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useCategoryOverBudgetCheck } from '@/features/finance/budget/budget.envelope.hooks';
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
  const { check: checkCategory } = useCategoryOverBudgetCheck();
  const { show } = useToast();
  const defaultAccountId = useDefaultAccountId();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  // The pending breach, or null when the save is clear. `categoryName` is set
  // only for a category-envelope breach, so the alert can name it.
  const [breach, setBreach] = useState<{ overage: number; categoryName?: string } | null>(null);
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
    const amountFCFA = Math.trunc(Number(log.amount));

    // The category envelope is checked first: "3,000 over your Food budget"
    // points at a specific decision, where the month-wide warning only says
    // that something, somewhere, is too much.
    if (log.categoryId !== null) {
      const categoryResult = await checkCategory(log.categoryId, amountFCFA);
      if (categoryResult.isOver) {
        setBreach({ overage: categoryResult.overage, categoryName: categoryResult.categoryName });
        return;
      }
    }

    const result = await check(amountFCFA);
    if (result.isOver) {
      setBreach({ overage: result.overage });
      return;
    }
    await persist();
  };

  return (
    <View style={styles.container}>
      <AmountInput value={log.amount} onChangeText={log.setAmount} autoFocus={autoFocus} />

      <Pressable
        accessibilityRole="button"
        testID="expense-category-trigger"
        style={styles.categoryTrigger}
        onPress={() => setPickerVisible(true)}
      >
        <View style={styles.categoryContent}>
          <Icon
            name="categories"
            size={18}
            color={categoryLabel ? c.TEXT_PRIMARY : c.PRIMARY_GREEN}
          />
          <Typography style={categoryLabel ? undefined : styles.categoryPlaceholder}>
            {categoryLabel ?? 'Select category'}
          </Typography>
        </View>
        <Icon name="forward" size={18} color={c.TEXT_MUTED} />
      </Pressable>

      <View>
        <Typography variant="muted" style={styles.noteLabel}>
          Description
        </Typography>
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
      </View>

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
        visible={breach !== null}
        overage={breach?.overage ?? 0}
        categoryName={breach?.categoryName}
        onProceed={() => {
          setBreach(null);
          void persist();
        }}
        onCancel={() => setBreach(null)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    gap: 10,
  },
  categoryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.BORDER_STRONG,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryPlaceholder: { color: c.PRIMARY_GREEN },
  noteLabel: { marginBottom: 6 },
  note: {
    minHeight: 64,
    paddingTop: 10,
    borderColor: c.BORDER_STRONG,
    color: c.TEXT_PRIMARY,
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
