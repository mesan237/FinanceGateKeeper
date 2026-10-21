import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { DateField } from '@/components/DateField';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextInput } from '@/components/TextInput';
import { Toggle } from '@/components/Toggle';
import { Typography } from '@/components/Typography';
import type { DebtDirection } from '@/constants/debt';
import type { CycleFrequency } from '@/utils/cycleDate';
import { formatCurrency } from '@/utils/formatCurrency';
import { instalmentAmounts } from '@/utils/instalments';

/** The terms part of the debt form, as typed. */
export interface DebtTermsDraft {
  /** Digits, or '' for "just the amount". */
  total: string;
  instalmentsOn: boolean;
  /** Digits. */
  count: string;
  frequency: CycleFrequency;
  firstDate: string;
}

export interface DebtTermsFieldsProps {
  direction: DebtDirection;
  /** The amount borrowed or lent, already parsed (0 while blank). */
  amount: number;
  draft: DebtTermsDraft;
  onChange: (draft: DebtTermsDraft) => void;
}

const FREQUENCIES: ReadonlyArray<CycleFrequency> = ['weekly', 'monthly'];

/**
 * Optional loan terms on the debt form (VS-54): the total to repay — the user
 * types it rather than a rate — with what that costs (or earns, for a loan
 * given), and an equal-instalment schedule previewed as "6 × 20 000 FCFA".
 */
export function DebtTermsFields({ direction, amount, draft, onChange }: DebtTermsFieldsProps) {
  const { t } = useTranslation('debt');
  const set = (patch: Partial<DebtTermsDraft>) => onChange({ ...draft, ...patch });
  const total = draft.total === '' ? amount : Number(draft.total);
  const cost = total - amount;
  const count = Number(draft.count);

  return (
    <View style={styles.fields}>
      <View style={styles.field}>
        <Typography variant="label">{t(direction === 'lent' ? 'terms.totalLent' : 'terms.total')}</Typography>
        <AmountInput
          testID="debt-total"
          value={draft.total}
          onChangeText={(total) => set({ total })}
          accessibilityLabel={t(direction === 'lent' ? 'terms.totalLent' : 'terms.total')}
        />
        <Typography variant="muted">
          {draft.total !== '' && amount > 0 && cost > 0
            ? t(direction === 'lent' ? 'terms.earns' : 'terms.costs', { cost: formatCurrency(cost) })
            : t('terms.totalHint')}
        </Typography>
      </View>

      <View style={styles.row}>
        <Typography style={styles.grow}>{t('terms.instalments')}</Typography>
        <Toggle
          testID="debt-instalments-toggle"
          value={draft.instalmentsOn}
          accessibilityLabel={t('terms.instalments')}
          onValueChange={(instalmentsOn) => set({ instalmentsOn })}
        />
      </View>

      {draft.instalmentsOn ? (
        <View style={styles.fields}>
          <View style={styles.field}>
            <Typography variant="label">{t('terms.count')}</Typography>
            <TextInput
              testID="debt-instalments"
              keyboardType="number-pad"
              value={draft.count}
              onChangeText={(value) => set({ count: value.replace(/\D/g, '') })}
              accessibilityLabel={t('terms.count')}
            />
            {count >= 2 && total > 0 ? (
              <Typography variant="muted">
                {t('terms.preview', { count, amount: formatCurrency(instalmentAmounts(total, count)[0]) })}
              </Typography>
            ) : null}
          </View>
          <View style={styles.field}>
            <Typography variant="label">{t('terms.frequency')}</Typography>
            <SegmentedControl
              testID="debt-instalment-frequency"
              segments={FREQUENCIES.map((f) => ({ key: f, label: t(`terms.frequencies.${f}`) }))}
              value={draft.frequency}
              onChange={(key) => set({ frequency: key as CycleFrequency })}
            />
          </View>
          <View style={styles.field}>
            <Typography variant="label">{t('terms.firstDate')}</Typography>
            <DateField
              testID="debt-first-instalment"
              value={draft.firstDate}
              onChange={(firstDate) => set({ firstDate })}
              accessibilityLabel={t('terms.firstDate')}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 16 },
  field: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
});
