import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Toggle } from '@/components/Toggle';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatDateShort } from '@/utils/formatDate';

import { useEstimates } from './budget.baseline.hooks';
import type { BaselineFact } from './budget.types';

/**
 * "Your estimates" (VS-46): typical monthly income, whether it arrives
 * regularly (and on which day), and what the month's essentials cost. These
 * let the app plan from day one; once real months are logged, Reports sets
 * them beside what actually happened. Each answer says when it was set and
 * whether it was typed or accepted from logged months.
 */
export function EstimatesScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['budget', 'common']);
  const { baseline, save } = useEstimates();

  const [income, setIncome] = useState('');
  const [regular, setRegular] = useState(true);
  const [payDay, setPayDay] = useState('');
  const [essentials, setEssentials] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!baseline) return;
    if (baseline.monthlyIncome) setIncome(String(baseline.monthlyIncome.value));
    if (baseline.incomeRegular !== null) setRegular(baseline.incomeRegular);
    if (baseline.payDay !== null) setPayDay(String(baseline.payDay));
    if (baseline.monthlyEssentials) setEssentials(String(baseline.monthlyEssentials.value));
  }, [baseline]);

  const day = Number(payDay);
  const canSave =
    income !== '' && essentials !== '' && (!regular || payDay === '' || (Number.isInteger(day) && day >= 1 && day <= 31));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await save({
        monthlyIncome: Math.trunc(Number(income)),
        incomeRegular: regular,
        payDay: regular && payDay !== '' ? day : null,
        monthlyEssentials: Math.trunc(Number(essentials)),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  /** "Set on 1 Oct · you typed it" / "· from your logged months". */
  const origin = (fact: BaselineFact | null) =>
    fact
      ? t(fact.source === 'observed' ? 'estimates.originObserved' : 'estimates.originUser', {
          date: formatDateShort(fact.setAt.slice(0, 10)),
        })
      : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('estimates.title')} cancelLabel={t('common:actions.cancel')} />
      <KeyboardAwareForm contentContainerStyle={styles.fields}>
        <Typography variant="muted">{t('estimates.intro')}</Typography>

        <View style={styles.field}>
          <Typography variant="label">{t('estimates.income')}</Typography>
          <AmountInput testID="estimate-income" value={income} onChangeText={setIncome} />
          {origin(baseline?.monthlyIncome ?? null) ? (
            <Typography variant="muted">{origin(baseline?.monthlyIncome ?? null)}</Typography>
          ) : null}
        </View>

        <View style={styles.row}>
          <Typography style={styles.grow}>{t('estimates.regular')}</Typography>
          <Toggle value={regular} onValueChange={setRegular} accessibilityLabel={t('estimates.regular')} />
        </View>

        {regular ? (
          <View style={styles.field}>
            <Typography variant="label">{t('estimates.payDay')}</Typography>
            <TextInput
              testID="estimate-pay-day"
              keyboardType="number-pad"
              placeholder={t('estimates.payDayPlaceholder')}
              value={payDay}
              onChangeText={setPayDay}
              accessibilityLabel={t('estimates.payDay')}
            />
          </View>
        ) : (
          <Typography variant="muted">{t('estimates.irregularHint')}</Typography>
        )}

        <View style={styles.field}>
          <Typography variant="label">{t('estimates.essentials')}</Typography>
          <Typography variant="muted">{t('estimates.essentialsHint')}</Typography>
          <AmountInput testID="estimate-essentials" value={essentials} onChangeText={setEssentials} />
          {origin(baseline?.monthlyEssentials ?? null) ? (
            <Typography variant="muted">{origin(baseline?.monthlyEssentials ?? null)}</Typography>
          ) : null}
        </View>

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
        <Button label={t('common:actions.save')} onPress={handleSave} disabled={!canSave} loading={saving} />
      </KeyboardAwareForm>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, padding: 16, gap: 12 },
    fields: { gap: 16 },
    field: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    grow: { flex: 1 },
    error: { color: c.DANGER },
  });
