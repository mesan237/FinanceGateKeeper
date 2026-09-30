import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { DEBT_DIRECTION_VALUES, type DebtDirection } from '@/constants/debt';

import { createDebt } from './debt.service';

/**
 * Create form for a new debt: person, amount, direction (Lent / Owed), and an
 * optional due date and note. The amount uses the shared FCFA field and the due
 * date a calendar picker (clearable), so nobody types `YYYY-MM-DD` by hand. The
 * Save button sits in a footer that clears the Android system bar. On save it
 * creates the debt and returns to the ledger. (Editing lives in `DebtDetail`;
 * this form is create-only.)
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
        dueDate: due === '' ? null : due,
        note: note.trim() === '' ? null : note.trim(),
      });
      router.replace('/debt');
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.createFailed', { ns: 'debt' }));
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('form.title')} cancelLabel={t('common:actions.cancel')} />

      <KeyboardAwareForm>
        <View style={styles.fields}>
          <SegmentedControl
            testID="debt-direction"
            segments={DEBT_DIRECTION_VALUES.map((value) => ({
              key: value,
              label: t(`directions.${value}`),
            }))}
            value={direction}
            onChange={(key) => setDirection(key as DebtDirection)}
          />

          <View style={styles.field}>
            <Typography variant="label">{t('form.person')}</Typography>
            <TextInput
              testID="debt-person"
              placeholder={t('form.person')}
              value={person}
              onChangeText={setPerson}
              accessibilityLabel={t('form.person')}
            />
          </View>

          <View style={styles.field}>
            <Typography variant="label">{t('form.amount')}</Typography>
            <AmountInput
              testID="debt-amount"
              value={amount}
              onChangeText={setAmount}
              accessibilityLabel={t('form.amount')}
            />
          </View>

          <View style={styles.field}>
            <Typography variant="label">{t('form.dueDate')}</Typography>
            <DateField
              testID="debt-due"
              value={due}
              onChange={setDue}
              onClear={() => setDue('')}
              accessibilityLabel={t('form.dueDate')}
            />
          </View>

          <View style={styles.field}>
            <Typography variant="label">{t('form.note')}</Typography>
            <TextInput
              testID="debt-note"
              placeholder={t('form.notePlaceholder')}
              value={note}
              onChangeText={setNote}
              accessibilityLabel={t('form.note')}
            />
          </View>

          {error ? <Typography style={styles.error}>{error}</Typography> : null}
        </View>
      </KeyboardAwareForm>

      <View style={styles.footer}>
        <Button label={t('common:actions.save')} onPress={handleSave} disabled={!canSubmit} />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  fields: {
    paddingHorizontal: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  error: {
    color: c.DANGER,
  },
});
