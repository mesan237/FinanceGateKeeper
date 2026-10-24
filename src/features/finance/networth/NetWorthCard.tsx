import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import { partsLine, savingsLine, signedAmount } from './networth.format';
import { useNetWorth } from './networth.hooks';

/**
 * Net worth and savings rate on the Reports tab (VS-53): today's figure and
 * what it is made of, how it moved since the last closed month, this month's
 * savings rate so far and last month's. Re-reads on focus; "History" opens the
 * stored month-end figures. While loading it holds its place with a
 * placeholder; a failed load shows the shared error card (UX-16).
 */
export function NetWorthCard() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('networth');
  const { now, thisMonthRate, snapshots, loading, error, refresh } = useNetWorth();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading && !now) {
    return (
      <Card testID="networth-skeleton" style={styles.card}>
        <Skeleton width="30%" height={11} />
        <Skeleton width="55%" height={28} />
        <Skeleton width="80%" height={12} />
        <Skeleton width="60%" height={12} />
      </Card>
    );
  }
  if (!now) {
    return (
      <ErrorState
        compact
        testID="networth-error"
        title={t('errors.loadTitle')}
        message={error}
        onRetry={() => void refresh()}
      />
    );
  }

  const last = snapshots[0] ?? null;

  return (
    <Card testID="networth-card" style={styles.card}>
      <Typography variant="label">{t('title')}</Typography>
      <Typography style={styles.total} testID="networth-total">
        {formatCurrency(now.total)}
      </Typography>
      <Typography variant="muted">{partsLine(now)}</Typography>
      <Typography variant="muted">
        {last
          ? t('since', { month: monthLabel(last.month), change: signedAmount(now.total - last.netWorth) })
          : t('noHistory')}
      </Typography>

      <View style={styles.section}>
        <Typography variant="label">{t('savings.title')}</Typography>
        <Typography>
          {thisMonthRate === null ? t('savings.thisMonthNone') : t('savings.thisMonth', { rate: thisMonthRate })}
        </Typography>
        {last ? <Typography variant="muted">{savingsLine(last.month, last.savingsRate)}</Typography> : null}
      </View>

      <View style={styles.actions}>
        <Button
          testID="networth-history"
          label={t('openHistory')}
          variant="secondary"
          compact
          onPress={() => router.push('/reports/net-worth')}
        />
      </View>
    </Card>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.sm },
    total: { fontSize: 28, fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    section: { gap: 4, marginTop: SPACING.sm },
    actions: { flexDirection: 'row' },
  });
