import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
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

const FREQUENCIES: ReadonlyArray<Frequency> = ['monthly', 'weekly'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Modal form for creating or editing a recurring expense: label, amount,
 * frequency (Monthly / Weekly pills), next-due-date, and category. Validates
 * locally before delegating to `onSave`.
 */
export function RecurringExpenseForm({ visible, recurring, onSave, onClose }: RecurringExpenseFormProps) {
  const styles = useThemedStyles(makeStyles);
  const { displayLabelFor } = useCategories();
  const { t } = useTranslation(['expenses', 'common']);
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
      setCategoryLabel(displayLabelFor(recurring.categoryId, recurring.subcategoryId));
    } else {
      setLabel('');
      setAmount('');
      setFrequency('monthly');
      setNextDueDate(toISODate(new Date()));
      setCategoryId(null);
      setSubcategoryId(null);
      setCategoryLabel(null);
    }
  }, [visible, recurring, displayLabelFor]);

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (
      !label.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      categoryId === null ||
      !ISO_DATE.test(nextDueDate)
    ) {
      setError(t('recurring.invalid'));
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
          {recurring ? t('recurring.editRecurring') : t('recurring.newRecurring')}
        </Typography>

        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={t('recurring.labelPlaceholder')}
          accessibilityLabel={t('recurring.labelA11y')}
          testID="recurring-label-input"
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder={t('quickAdd.amountPlaceholder')}
          keyboardType="numeric"
          accessibilityLabel={t('recurring.amountA11y')}
          testID="recurring-amount-input"
        />

        <View style={styles.pills}>
          {FREQUENCIES.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: frequency === option }}
              testID={`recurring-frequency-${option}`}
              style={[styles.pill, frequency === option && styles.pillActive]}
              onPress={() => setFrequency(option)}
            >
              <Typography style={frequency === option ? styles.pillTextActive : styles.pillText}>
                {t(`recurring.frequency.${option}`)}
              </Typography>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={nextDueDate}
          onChangeText={setNextDueDate}
          placeholder={t('recurring.datePlaceholder')}
          accessibilityLabel={t('recurring.dateA11y')}
          testID="recurring-date-input"
        />
        <Button
          label={categoryLabel ?? t('selectCategory')}
          onPress={() => setPickerVisible(true)}
        />

        {error ? <Typography style={styles.error}>{error}</Typography> : null}

        <Button label={t('common:actions.save')} onPress={handleSave} testID="recurring-save" />
        <Button label={t('common:actions.cancel')} onPress={onClose} testID="recurring-cancel" />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: c.PRIMARY_GREEN,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: c.PRIMARY_GREEN,
  },
  pillText: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  pillTextActive: {
    color: c.TEXT_INVERSE,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  error: {
    color: c.DANGER,
  },
});
