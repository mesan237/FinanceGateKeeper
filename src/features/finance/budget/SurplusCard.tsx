import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';

export interface SurplusCardProps {
  /** Income received beyond the month's budget. */
  amount: number;
  onAddToBudget: () => void;
  onLeave: () => void;
}

/**
 * "Give it a job" (VS-47): income beyond the month's budget never raises the
 * budget on its own. This card names the surplus and lets the user decide —
 * add it to the month's budget, or leave it unassigned.
 */
export function SurplusCard({ amount, onAddToBudget, onLeave }: SurplusCardProps) {
  const { t } = useTranslation('budget');

  return (
    <Card testID="surplus-card" style={styles.card}>
      <Typography variant="subheading">{t('surplus.title', { amount: formatCurrency(amount) })}</Typography>
      <Typography variant="muted">{t('surplus.hint')}</Typography>
      <View style={styles.actions}>
        <Button testID="surplus-add" label={t('surplus.add')} compact onPress={onAddToBudget} />
        <Button
          testID="surplus-leave"
          label={t('surplus.leave')}
          variant="ghost"
          compact
          onPress={onLeave}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
});
