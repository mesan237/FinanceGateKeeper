import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER, PRIMARY_GREEN } from '@/constants/colors';
import { toISODate } from '@/utils/formatDate';

import { CategoryPicker } from './CategoryPicker';
import { useCategories } from './expenses.hooks';
import type { Frequency, NewRecurringExpense, RecurringExpense } from './expenses.types';

export interface RecurringExpenseFormProps {
  visible: boolean;
  /** The entry being edited, or `null` for create mode. */
  recurring: RecurringExpense | null;
  onSave: (input: NewRecurringExpense) => Promise<void>;
  onClose: () => void;
}

const FREQUENCIES: ReadonlyArray<{ value: Frequency; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Modal form for creating or editing a recurring expense: label, amount,
 * frequency (Monthly / Weekly pills), next-due-date, and category. Validates
 * locally before delegating to `onSave`.
 */
export function RecurringExpenseForm({ visible, recurring, onSave, onClose }: RecurringExpenseFormProps) {
  const { labelFor } = useCategories();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever it opens (prefilled in edit mode, defaults in create).
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (recurring) {
      setLabel(recurring.label);
      setAmount(String(recurring.amount));
      setFrequency(recurring.frequency);
      setNextDueDate(recurring.nextDueDate);
      setCategoryId(recurring.categoryId);
      setSubcategoryId(recurring.subcategoryId);
      setCategoryLabel(labelFor(recurring.categoryId, recurring.subcategoryId));
    } else {
      setLabel('');
      setAmount('');
      setFrequency('monthly');
      setNextDueDate(toISODate(new Date()));
      setCategoryId(null);
      setSubcategoryId(null);
      setCategoryLabel(null);
    }
  }, [visible, recurring, labelFor]);

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (
      !label.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      categoryId === null ||
      !ISO_DATE.test(nextDueDate)
    ) {
      setError('Enter a label, amount > 0, a category, and a valid next due date (YYYY-MM-DD).');
      return;
    }
    await onSave({
      label: label.trim(),
      amount: Math.trunc(numericAmount),
      categoryId,
      subcategoryId,
      frequency,
      nextDueDate,
      isActive: recurring ? recurring.isActive : true,
    });
    onClose();
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.form}>
        <Typography variant="subheading">
          {recurring ? 'Edit recurring' : 'New recurring'}
        </Typography>

        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Label (e.g. Rent)"
          accessibilityLabel="Recurring label"
          testID="recurring-label-input"
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (FCFA)"
          keyboardType="numeric"
          accessibilityLabel="Recurring amount"
          testID="recurring-amount-input"
        />

        <View style={styles.pills}>
          {FREQUENCIES.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: frequency === option.value }}
              testID={`recurring-frequency-${option.value}`}
              style={[styles.pill, frequency === option.value && styles.pillActive]}
              onPress={() => setFrequency(option.value)}
            >
              <Typography style={frequency === option.value ? styles.pillTextActive : styles.pillText}>
                {option.label}
              </Typography>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={nextDueDate}
          onChangeText={setNextDueDate}
          placeholder="Next due date (YYYY-MM-DD)"
          accessibilityLabel="Next due date"
          testID="recurring-date-input"
        />
        <Button
          label={categoryLabel ?? 'Select category'}
          onPress={() => setPickerVisible(true)}
        />

        {error ? <Typography style={styles.error}>{error}</Typography> : null}

        <Button label="Save" onPress={handleSave} testID="recurring-save" />
        <Button label="Cancel" onPress={onClose} testID="recurring-cancel" />
      </View>

      <CategoryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selection) => {
          setCategoryId(selection.categoryId);
          setSubcategoryId(selection.subcategoryId);
          setCategoryLabel(selection.label);
          setPickerVisible(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_GREEN,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: PRIMARY_GREEN,
  },
  pillText: {
    color: PRIMARY_GREEN,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  error: {
    color: DANGER,
  },
});
