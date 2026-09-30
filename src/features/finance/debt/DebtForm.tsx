import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { DEBT_DIRECTION_VALUES, type DebtDirection } from '@/constants/debt';

import { createDebt } from './debt.service';

/**
 * Create form for a new debt: person, amount, direction (Lent / Owed), and an
 * optional due date and note. On save it creates the debt and returns to the
 * ledger. (Editing lives in `DebtDetail`; this form is create-only.)
 */
export function DebtForm() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['debt', 'common']);
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
      setError(e instanceof Error ? e.message : i18n.t('errors.createFailed', { ns: 'debt' }));
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('form.title')} cancelLabel={t('common:actions.cancel')} />

      <TextInput
        testID="debt-person"
        placeholder={t('form.person')}
        value={person}
        onChangeText={setPerson}
        accessibilityLabel={t('form.person')}
      />
      <TextInput
        testID="debt-amount"
        placeholder={t('form.amountPlaceholder')}
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        accessibilityLabel={t('form.amount')}
      />

      <View style={styles.directionRow}>
        {DEBT_DIRECTION_VALUES.map((value) => {

          const active = direction === value;
          const name = t(`directions.${value}`);
          const label = active ? `● ${name}` : name;
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
        placeholder={t('form.duePlaceholder')}
        value={due}
        onChangeText={setDue}
        accessibilityLabel={t('form.dueDate')}
      />
      <TextInput
        testID="debt-note"
        placeholder={t('form.notePlaceholder')}
        value={note}
        onChangeText={setNote}
        accessibilityLabel={t('form.note')}
      />

      <Button label={t('common:actions.save')} onPress={handleSave} disabled={!canSubmit} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
    color: c.DANGER,
  },
});
