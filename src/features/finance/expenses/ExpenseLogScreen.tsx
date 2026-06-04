import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';

import { CategoryPicker } from './CategoryPicker';
import { useExpenseLog } from './expenses.hooks';

/**
 * Manual expense entry form: amount, category (via the modal picker), an
 * optional note, and a date that defaults to today. On a successful save it
 * returns to the transactions tab.
 */
export function ExpenseLogScreen() {
  const router = useRouter();
  const log = useExpenseLog();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);

  const handleSave = async () => {
    const id = await log.submit();
    if (id !== null) {
      router.replace('/(tabs)/transactions');
    }
  };

  return (
    <View style={styles.container}>
      <Typography variant="heading">Log Expense</Typography>

      <TextInput
        value={log.amount}
        onChangeText={log.setAmount}
        placeholder="Amount (FCFA)"
        keyboardType="numeric"
        accessibilityLabel="Amount"
      />

      <Button
        label={categoryLabel ?? 'Select category'}
        onPress={() => setPickerVisible(true)}
      />

      <TextInput
        value={log.note}
        onChangeText={log.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
      />

      <TextInput
        value={log.date}
        onChangeText={log.setDate}
        placeholder="YYYY-MM-DD"
        accessibilityLabel="Date"
      />

      <Button label="Save" onPress={handleSave} disabled={!log.canSubmit} />

      {log.error ? (
        <Typography style={styles.error}>{log.error}</Typography>
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
});
