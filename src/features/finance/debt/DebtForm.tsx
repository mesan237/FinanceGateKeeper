import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';
import { DEBT_DIRECTION_LABELS, DEBT_DIRECTION_VALUES, type DebtDirection } from '@/constants/debt';

import { createDebt } from './debt.service';

/**
 * Create form for a new debt: person, amount, direction (Lent / Owed), and an
 * optional due date and note. On save it creates the debt and returns to the
 * ledger. (Editing lives in `DebtDetail`; this form is create-only.)
 */
export function DebtForm() {
  const router = useRouter();
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('lent');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedAmount = Number(amount);
  const canSubmit =
    person.trim().length > 0 && Number.isInteger(parsedAmount) && parsedAmount > 0 && !saving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createDebt({
        personName: person.trim(),
        amount: parsedAmount,
        direction,
        dueDate: due.trim() === '' ? null : due.trim(),
        note: note.trim() === '' ? null : note.trim(),
      });
      router.replace('/debt');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create debt.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="New Debt" cancelLabel="Cancel" />

      <TextInput
        testID="debt-person"
        placeholder="Person"
        value={person}
        onChangeText={setPerson}
        accessibilityLabel="Person"
      />
      <TextInput
        testID="debt-amount"
        placeholder="Amount (FCFA)"
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        accessibilityLabel="Amount"
      />

      <View style={styles.directionRow}>
        {DEBT_DIRECTION_VALUES.map((value) => {
          const active = direction === value;
          const label = active
            ? `● ${DEBT_DIRECTION_LABELS[value]}`
            : DEBT_DIRECTION_LABELS[value];
          return (
            <View key={value} style={styles.grow}>
              <Button
                testID={`debt-direction-${value}`}
                label={label}
                onPress={() => setDirection(value)}
              />
            </View>
          );
        })}
      </View>

      <TextInput
        testID="debt-due"
        placeholder="Due date (YYYY-MM-DD, optional)"
        value={due}
        onChangeText={setDue}
        accessibilityLabel="Due date"
      />
      <TextInput
        testID="debt-note"
        placeholder="Note (optional)"
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Note"
      />

      <Button label="Save" onPress={handleSave} disabled={!canSubmit} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  directionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  grow: {
    flex: 1,
  },
  error: {
    color: DANGER,
  },
});
