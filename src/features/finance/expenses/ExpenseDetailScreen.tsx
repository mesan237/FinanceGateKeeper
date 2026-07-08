import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { ICON_SIZE } from '@/constants/icons';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';

import { CategoryPicker } from './CategoryPicker';
import { useCategories, useExpenseEdit } from './expenses.hooks';

export interface ExpenseDetailScreenProps {
  expenseId: number;
}

/**
 * Pre-filled edit form for an existing expense. Allows updating amount,
 * category, subcategory, note, and date, or deleting the expense entirely.
 */
export function ExpenseDetailScreen({ expenseId }: ExpenseDetailScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const edit = useExpenseEdit(expenseId);
  const { labelFor, loading: categoriesLoading } = useCategories();
  const { check } = useOverBudgetCheck();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [overage, setOverage] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!edit.loading && !categoriesLoading && edit.categoryId !== null) {
      setCategoryLabel(labelFor(edit.categoryId, edit.subcategoryId));
    }
  }, [edit.loading, edit.categoryId, edit.subcategoryId, categoriesLoading, labelFor]);

  const handleSave = async () => {
    const newAmount = Math.trunc(Number(edit.amount));
    const amountChanged = edit.originalAmount !== null && newAmount !== edit.originalAmount;
    if (amountChanged && newAmount > (edit.originalAmount ?? 0)) {
      const result = await check(newAmount);
      if (result.isOver) {
        setOverage(result.overage);
        return;
      }
    }
    setSaving(true);
    try {
      const ok = await edit.update();
      if (ok) router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    const ok = await edit.remove();
    if (ok) router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Expense" />

      <KeyboardAwareForm>
        <View style={styles.form}>
          <AmountInput value={edit.amount} onChangeText={edit.setAmount} />

          <Button
            label={categoryLabel ?? 'Select category'}
            variant="secondary"
            onPress={() => setPickerVisible(true)}
          />

          <TextInput
            value={edit.note}
            onChangeText={edit.setNote}
            placeholder="Note (optional)"
            accessibilityLabel="Note"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.note}
          />

          <DateField value={edit.date} onChange={edit.setDate} testID="expense-date" />

          <AccountPicker
            testID="expense-account"
            label="Account"
            value={edit.accountId}
            onChange={edit.setAccountId}
          />

          <Button label="Save" onPress={handleSave} disabled={!edit.canSubmit} loading={saving} />

          {edit.error ? (
            <View style={styles.errorRow}>
              <Icon name="alert" size={ICON_SIZE.sm} color={c.DANGER} />
              <Typography style={styles.error}>{edit.error}</Typography>
            </View>
          ) : null}

          <Button
            label="Delete expense"
            variant="danger"
            onPress={() => setDeleteModalVisible(true)}
          />
        </View>
      </KeyboardAwareForm>

      <CategoryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selection) => {
          edit.setCategoryId(selection.categoryId);
          edit.setSubcategoryId(selection.subcategoryId);
          setCategoryLabel(selection.label);
          setPickerVisible(false);
        }}
      />

      <Modal
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.deleteModal}>
          <Typography variant="subheading">Delete expense?</Typography>
          <Typography variant="muted">
            Delete this expense? This cannot be undone.
          </Typography>
          <Button label="Delete" onPress={handleDeleteConfirm} variant="danger" />
          <Button testID="delete-modal-cancel" label="Cancel" onPress={() => setDeleteModalVisible(false)} />
        </View>
      </Modal>

      <OverBudgetAlert
        visible={overage !== null}
        overage={overage ?? 0}
        onProceed={async () => {
          setOverage(null);
          const ok = await edit.update();
          if (ok) router.back();
        }}
        onCancel={() => setOverage(null)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  form: {
    gap: 12,
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
  deleteModal: {
    gap: 12,
  },
});
