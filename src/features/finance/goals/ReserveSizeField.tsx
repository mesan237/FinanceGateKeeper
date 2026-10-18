import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';

import { RESERVE_MONTHS, type EssentialMonthly } from './goals.types';

export interface ReserveSizeFieldProps {
  months: number;
  onMonthsChange: (months: number) => void;
  /** One month of essentials and where it came from; null while loading. */
  essentials: EssentialMonthly | null;
}

/**
 * How big an emergency reserve is (VS-50): the user picks the months, the app
 * shows `months × essentials` and says what the essentials figure rests on —
 * observed complete months or the estimate, provisional below three months.
 * With nothing to size from, it says so and opens the Estimates screen by path.
 */
export function ReserveSizeField({ months, onMonthsChange, essentials }: ReserveSizeFieldProps) {
  const router = useRouter();
  const { t } = useTranslation('goals');

  const picker = (
    <SegmentedControl
      testID="goal-months"
      segments={RESERVE_MONTHS.map((m) => ({ key: String(m), label: String(m) }))}
      value={String(months)}
      onChange={(key) => onMonthsChange(Number(key))}
    />
  );

  if (!essentials) return picker;

  if (essentials.amount === null) {
    return (
      <View style={styles.field}>
        {picker}
        <Typography variant="muted" testID="goal-reserve-missing">
          {t('form.reserveMissing')}
        </Typography>
        <Button
          testID="goal-open-estimates"
          label={t('form.openEstimates')}
          variant="secondary"
          compact
          onPress={() => router.push('/budget/estimates')}
        />
      </View>
    );
  }

  const basis =
    essentials.source === 'observed'
      ? t('form.basisObserved', { count: essentials.completeMonths })
      : t('form.basisEstimate');
  const provisional = essentials.completeMonths < 3 ? ` ${t('form.provisional')}` : '';

  return (
    <View style={styles.field}>
      {picker}
      <Typography testID="goal-reserve-size">
        {t('form.reserveSize', {
          amount: formatCurrency(months * essentials.amount),
          months,
          essentials: formatCurrency(essentials.amount),
        })}
      </Typography>
      <Typography variant="muted">{`${basis}${provisional}`}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
});
