import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

import { useDebtDetail } from './debt.hooks';

export interface DebtDetailProps {
  debtId: number;
}

/**
 * Full detail for one debt: person, amount, direction, due date, note, and
 * status, with actions to mark it settled (pending only) or delete it. Every
 * state (loading, not found, loaded) keeps the back header, and the actions sit
 * in a footer that clears the Android system bar. Reads and mutates through
 * `useDebtDetail`.
 */
export function DebtDetail({ debtId }: DebtDetailProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['debt', 'common']);
  const { debt, loading, error, settle, remove } = useDebtDetail(debtId);

  if (loading && !debt) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('detail.title')} />
        <View style={styles.body}>
          <Typography variant="muted">{t('loading')}</Typography>
        </View>
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('detail.title')} />
        <View style={styles.body}>
          <Typography variant="muted">{t('detail.notFound')}</Typography>
          {error ? <Typography style={styles.error}>{error}</Typography> : null}
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    await remove();
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('detail.title')} />

      <ScrollView style={styles.grow} contentContainerStyle={styles.body}>
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

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        {debt.status === 'pending' ? (
          <Button label={t('detail.settle')} onPress={() => void settle()} />
        ) : null}
        <Button variant="danger" label={t('common:actions.delete')} onPress={handleDelete} />
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    gap: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
