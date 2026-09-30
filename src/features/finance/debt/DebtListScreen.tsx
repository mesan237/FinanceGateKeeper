import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { DEBT_DIRECTION_VALUES, type DebtDirection } from '@/constants/debt';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { useDebts } from './debt.hooks';
import type { Debt } from './debt.types';

/**
 * The people ledger: a back header, a Lent / Owed segmented switch (the active
 * direction is filled), the outstanding total for that direction, and the list
 * of debts. "Add debt" sits in a footer that clears the Android system bar;
 * tapping a row opens its detail. Reached from the Transactions screen (debt is
 * not a bottom tab).
 */
export function DebtListScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [direction, setDirection] = useState<DebtDirection>('lent');
  const { t } = useTranslation('debt');
  const { debts, totals, loading, error } = useDebts(direction);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('list.title')} />

      <View style={styles.body}>
        <SegmentedControl
          testID="debt-tab"
          segments={DEBT_DIRECTION_VALUES.map((value) => ({
            key: value,
            label: t(`directions.${value}`),
          }))}
          value={direction}
          onChange={(key) => setDirection(key as DebtDirection)}
        />

        <Typography variant="muted">
          {t('list.outstanding', { amount: formatCurrency(totals[direction]) })}
        </Typography>

        {loading ? (
          <Typography variant="muted">{t('loading')}</Typography>
        ) : debts.length === 0 ? (
          <Typography variant="muted">{t('list.empty')}</Typography>
        ) : (
          <ScrollView style={styles.grow} contentContainerStyle={styles.list}>
            {debts.map((debt) => (
              <DebtRow key={debt.id} debt={debt} onPress={() => router.push(`/debt/${debt.id}`)} />
            ))}
          </ScrollView>
        )}

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Button label={t('list.add')} onPress={() => router.push('/debt/create')} />
      </View>
    </View>
  );
}

interface DebtRowProps {
  debt: Debt;
  onPress: () => void;
}

function DebtRow({ debt, onPress }: DebtRowProps) {
  const styles = useThemedStyles(makeStyles);
  const settled = debt.status === 'settled';
  const { t } = useTranslation('debt');
  return (
    <Pressable testID={`debt-row-${debt.id}`} onPress={onPress}>
      <Card style={settled ? styles.settledCard : undefined}>
        <View style={styles.rowHeader}>
          <Typography variant="subheading">{debt.personName}</Typography>
          <Typography variant="muted">{t(`statuses.${debt.status}`)}</Typography>
        </View>
        <Typography>{formatCurrency(debt.amount)}</Typography>
        {debt.dueDate ? (
          <Typography variant="muted" style={styles.due}>
            {t('due', { date: formatDateShort(debt.dueDate) })}
          </Typography>
        ) : null}
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  grow: {
    flex: 1,
  },
  list: {
    gap: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  due: {
    color: c.TEXT_MUTED,
    marginTop: 4,
  },
  settledCard: {
    opacity: 0.6,
  },
  error: {
    color: c.DANGER,
  },
});
