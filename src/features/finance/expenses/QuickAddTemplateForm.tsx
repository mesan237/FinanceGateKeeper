import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import { CategoryPicker } from './CategoryPicker';
import { useCategories } from './expenses.hooks';
import type { NewQuickAddTemplate, QuickAddTemplate } from './expenses.types';

export interface QuickAddTemplateFormProps {
  visible: boolean;
  /** The template being edited, or `null` for create mode. */
  template: QuickAddTemplate | null;
  onSave: (input: NewQuickAddTemplate) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

/**
 * Modal form for creating or editing a quick-add template: label, amount, and
 * category (via the shared `CategoryPicker`). Shows a Delete button in edit
 * mode. Validates locally before delegating to `onSave`.
 */
export function QuickAddTemplateForm({
  visible,
  template,
  onSave,
  onDelete,
  onClose,
}: QuickAddTemplateFormProps) {
  const styles = useThemedStyles(makeStyles);
  const { labelFor } = useCategories();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever it opens (prefilled in edit mode, blank in create).
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (template) {
      setLabel(template.label);
      setAmount(String(template.amount));
      setCategoryId(template.categoryId);
      setSubcategoryId(template.subcategoryId);
      setCategoryLabel(labelFor(template.categoryId, template.subcategoryId));
    } else {
      setLabel('');
      setAmount('');
      setCategoryId(null);
      setSubcategoryId(null);
      setCategoryLabel(null);
    }
  }, [visible, template, labelFor]);

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (!label.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || categoryId === null) {
      setError('Enter a label, an amount greater than 0, and pick a category.');
      return;
    }
    await onSave({
      label: label.trim(),
      amount: Math.trunc(numericAmount),
      categoryId,
      subcategoryId,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (template) {
      await onDelete(template.id);
      onClose();
    }
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.form}>
        <Typography variant="subheading">
          {template ? 'Edit template' : 'New template'}
        </Typography>

        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Label (e.g. Taxi 500)"
          accessibilityLabel="Template label"
          testID="quick-add-label-input"
        />
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount (FCFA)"
          keyboardType="numeric"
          accessibilityLabel="Template amount"
          testID="quick-add-amount-input"
        />
        <Button
          label={categoryLabel ?? 'Select category'}
          onPress={() => setPickerVisible(true)}
        />

        {error ? <Typography style={styles.error}>{error}</Typography> : null}

        <Button label="Save" onPress={handleSave} testID="quick-add-save" />
        {template ? (
          <Button label="Delete" onPress={handleDelete} testID="quick-add-delete" />
        ) : null}
        <Button label="Cancel" onPress={onClose} testID="quick-add-cancel" />
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
  error: {
    color: c.DANGER,
  },
});
