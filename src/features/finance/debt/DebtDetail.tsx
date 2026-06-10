import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { DANGER, TEXT_MUTED } from '@/constants/colors';
import { DEBT_DIRECTION_LABELS, DEBT_STATUS_LABELS } from '@/constants/debt';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

import { useDebtDetail } from './debt.hooks';

export interface DebtDetailProps {
  debtId: number;
}

/**
 * Full detail for one debt: person, amount, direction, due date, note, and
 * status, with actions to mark it settled (pending only) or delete it. Reads
 * and mutates through `useDebtDetail`.
 */
export function DebtDetail({ debtId }: DebtDetailProps) {
  const router = useRouter();
  const { debt, loading, error, settle, remove } = useDebtDetail(debtId);

  if (loading && !debt) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Loading…</Typography>
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Debt not found.</Typography>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  const handleDelete = async () => {
    await remove();
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Debt" />
      <Card>
        <View style={styles.rowHeader}>
          <Typography variant="heading">{debt.personName}</Typography>
          <Typography variant="muted">{DEBT_STATUS_LABELS[debt.status]}</Typography>
        </View>
        <Typography variant="subheading">{formatCurrency(debt.amount)}</Typography>
        <Typography variant="muted">{DEBT_DIRECTION_LABELS[debt.direction]}</Typography>
        {debt.dueDate ? (
          <Typography variant="muted">{`Due ${formatDateLong(debt.dueDate)}`}</Typography>
        ) : null}
        {debt.note ? <Typography style={styles.note}>{debt.note}</Typography> : null}
      </Card>

      {debt.status === 'pending' ? (
        <Button label="Mark settled" onPress={() => void settle()} />
      ) : null}
      <Button label="Delete" onPress={handleDelete} />

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
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  note: {
    color: TEXT_MUTED,
    marginTop: 8,
  },
  error: {
    color: DANGER,
  },
});
