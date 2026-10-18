import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Pill, type PillTone } from '@/components/Pill';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { formatDateShort } from '@/utils/formatDate';

import type { CycleStatus, TontineCycle } from './tontines.types';

/** Chip tone per status: the word carries the meaning, colour only reinforces it. */
const TONE: Record<CycleStatus, PillTone> = {
  paid: 'success',
  overdue: 'danger',
  due: 'warning',
  upcoming: 'neutral',
};

export interface CycleRowProps {
  cycle: TontineCycle;
  onPay: () => void;
  onUndo: () => void;
}

/** One cycle of the schedule: its date, its status, the user's turn, and pay or undo. */
export function CycleRow({ cycle, onPay, onUndo }: CycleRowProps) {
  const { t } = useTranslation('tontines');
  const id = `cycle-${cycle.cycle}`;

  return (
    <View style={styles.row} testID={id}>
      <View style={styles.grow}>
        <Typography>{t('detail.cycle', { cycle: cycle.cycle })}</Typography>
        <Typography variant="muted">{formatDateShort(cycle.dueDate)}</Typography>
      </View>
      {cycle.isPayoutTurn ? <Pill label={t('detail.yourTurn')} tone="success" /> : null}
      <Pill label={t(`status.${cycle.status}`)} tone={TONE[cycle.status]} />
      {cycle.payment ? (
        <Button testID={`${id}-undo`} label={t('detail.undo')} variant="ghost" compact onPress={onUndo} />
      ) : (
        <Button testID={`${id}-pay`} label={t('detail.markPaid')} variant="secondary" compact onPress={onPay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  grow: { flex: 1 },
});
