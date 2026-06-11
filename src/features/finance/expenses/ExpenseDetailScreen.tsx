import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
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
  const router = useRouter();
  const edit = useExpenseEdit(expenseId);
  const { labelFor, loading: categoriesLoading } = useCategories();
  const { check } = useOverBudgetCheck();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [overage, setOverage] = useState<number | null>(null);

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
    const ok = await edit.update();
    if (ok) router.back();
  };

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    const ok = await edit.remove();
    if (ok) router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Expense" cancelLabel="Cancel" />

      <TextInput
        value={edit.amount}
        onChangeText={edit.setAmount}
        placeholder="Amount (FCFA)"
        keyboardType="numeric"
        accessibilityLabel="Amount"
      />

      <Button
        label={categoryLabel ?? 'Select category'}
        onPress={() => setPickerVisible(true)}
      />

      <TextInput
        value={edit.note}
        onChangeText={edit.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
      />

      <TextInput
        value={edit.date}
        onChangeText={edit.setDate}
        placeholder="YYYY-MM-DD"
        accessibilityLabel="Date"
      />

      <Button label="Save" onPress={handleSave} disabled={!edit.canSubmit} />

      {edit.error ? (
        <Typography style={styles.error}>{edit.error}</Typography>
      ) : null}

      <Button
        label="Delete expense"
        onPress={() => setDeleteModalVisible(true)}
              />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  error: {
    color: DANGER,
  },
  deleteModal: {
    gap: 12,
  },
});
