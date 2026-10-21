import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import { partsLine, savingsLine, signedAmount } from './networth.format';
import { useNetWorthHistory } from './networth.hooks';

/**
 * Month-end net worth history (VS-53, `/reports/net-worth`): each closed month
 * as it was stored, its change on the month before, and its savings rate. A
 * month can be recalculated on purpose; nothing is rewritten otherwise.
 */
export function NetWorthHistoryScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('networth');
  const { snapshots, loading, error, refresh, recalculate } = useNetWorthHistory();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('history.title')} />
      <ScrollView style={styles.grow} contentContainerStyle={styles.content}>
        <Typography variant="muted">{t('history.intro')}</Typography>

        {loading && snapshots.length === 0 ? <Typography variant="muted">{t('loading')}</Typography> : null}
        {!loading && snapshots.length === 0 ? <Typography variant="muted">{t('history.empty')}</Typography> : null}

        {snapshots.map((snapshot, index) => {
          const previous = snapshots[index + 1];
          return (
            <Card key={snapshot.month} testID={`snapshot-${snapshot.month}`} style={styles.card}>
              <View style={styles.row}>
                <Typography variant="label" style={styles.grow}>
                  {monthLabel(snapshot.month)}
                </Typography>
                <Typography style={styles.amount}>{formatCurrency(snapshot.netWorth)}</Typography>
              </View>
              <Typography variant="muted">
                {partsLine({
                  wallets: snapshot.wallets,
                  lent: snapshot.lent,
                  owed: snapshot.owed,
                  tontines: snapshot.tontines,
                  total: snapshot.netWorth,
                })}
              </Typography>
              {previous ? (
                <Typography variant="muted">
                  {t('history.change', { change: signedAmount(snapshot.netWorth - previous.netWorth) })}
                </Typography>
              ) : null}
              <Typography>{savingsLine(snapshot.month, snapshot.savingsRate)}</Typography>
              <View style={styles.actions}>
                <Button
                  testID={`snapshot-${snapshot.month}-recalculate`}
                  label={t('history.recalculate')}
                  variant="ghost"
                  compact
                  onPress={() => void recalculate(snapshot.month)}
                />
              </View>
            </Card>
          );
        })}

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    grow: { flex: 1 },
    content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
    card: { gap: SPACING.xs },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    actions: { flexDirection: 'row' },
    error: { color: c.DANGER },
  });
