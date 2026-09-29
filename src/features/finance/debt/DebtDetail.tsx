import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

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
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['debt', 'common']);
  const { debt, loading, error, settle, remove } = useDebtDetail(debtId);

  if (loading && !debt) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('loading')}</Typography>
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">{t('detail.notFound')}</Typography>
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
      <ScreenHeader title={t('detail.title')} />
      <Card>
        <View style={styles.rowHeader}>
          <Typography variant="heading">{debt.personName}</Typography>
          <Typography variant="muted">{t(`statuses.${debt.status}`)}</Typography>
        </View>
        <Typography variant="subheading">{formatCurrency(debt.amount)}</Typography>
        <Typography variant="muted">{t(`directions.${debt.direction}`)}</Typography>
        {debt.dueDate ? (
          <Typography variant="muted">{t('due', { date: formatDateLong(debt.dueDate) })}</Typography>
        ) : null}
        {debt.note ? <Typography style={styles.note}>{debt.note}</Typography> : null}
      </Card>

      {debt.status === 'pending' ? (
        <Button label={t('detail.settle')} onPress={() => void settle()} />
      ) : null}
      <Button label={t('common:actions.delete')} onPress={handleDelete} />

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
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  note: {
    color: c.TEXT_MUTED,
    marginTop: 8,
  },
  error: {
    color: c.DANGER,
  },
});
