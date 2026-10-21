import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Pill, type PillTone } from '@/components/Pill';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import type { Instalment } from './debt.types';

/** Chip tone per status: the word carries the meaning, colour only reinforces it. */
const TONE: Record<Instalment['status'], PillTone> = {
  paid: 'success',
  overdue: 'danger',
  due: 'warning',
  upcoming: 'neutral',
};

export interface DebtInstalmentsProps {
  instalments: Instalment[];
  onPay: (instalment: Instalment) => void;
  onUndo: (paymentId: number) => void;
}

/**
 * A scheduled debt's instalments (VS-54): each with its day, amount and status,
 * and "Mark paid" — which records a repayment of exactly that instalment — or
 * "Undo" once paid.
 */
export function DebtInstalments({ instalments, onPay, onUndo }: DebtInstalmentsProps) {
  const { t } = useTranslation('debt');

  return (
    <View style={styles.list}>
      <Typography variant="label">{t('terms.schedule')}</Typography>
      {instalments.map((instalment) => {
        const id = `instalment-${instalment.n}`;
        return (
          <View key={instalment.n} style={styles.row} testID={id}>
            <View style={styles.grow}>
              <Typography>{t('terms.instalment', { n: instalment.n })}</Typography>
              <Typography variant="muted">
                {`${formatDateShort(instalment.dueDate)} · ${formatCurrency(instalment.amount)}`}
              </Typography>
            </View>
            <Pill label={t(`terms.status.${instalment.status}`)} tone={TONE[instalment.status]} />
            {instalment.payment ? (
              <Button
                testID={`${id}-undo`}
                label={t('terms.undo')}
                variant="ghost"
                compact
                onPress={() => instalment.payment && onUndo(instalment.payment.id)}
              />
            ) : (
              <Button
                testID={`${id}-pay`}
                label={t('terms.markPaid')}
                variant="secondary"
                compact
                onPress={() => onPay(instalment)}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
});
