import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { CycleRow } from './CycleRow';
import { PaymentSheet, type PaymentSheetMode } from './PaymentSheet';
import { TontineCard } from './TontineCard';
import { useTontineDetail } from './tontines.hooks';

export interface TontineDetailProps {
  tontineId: number;
}

/**
 * One tontine (VS-51): its summary, the payout, and the whole schedule. Ticking
 * a cycle opens the payment sheet to choose the wallet and the day; a paid
 * cycle can be undone. The payout can be recorded once the turn is known.
 */
export function TontineDetail({ tontineId }: TontineDetailProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('tontines');
  const { tontine, loading, error, refresh, pay, payout, remove } = useTontineDetail(tontineId);
  const [sheet, setSheet] = useState<PaymentSheetMode | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const save = (input: { amount: number; accountId: number | null; date: string }) => {
    if (sheet?.kind === 'contribution') return pay(sheet.cycle, input.accountId, input.date);
    return payout(input.amount, input.accountId, input.date);
  };

  const received = tontine?.summary.payout ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={tontine?.name ?? t('title')} />

      {loading && !tontine ? (
        <Typography variant="muted" style={styles.pad}>
          {t('loading')}
        </Typography>
      ) : tontine ? (
        <ScrollView style={styles.grow} contentContainerStyle={styles.content}>
          <TontineCard tontine={tontine} />

          <Card style={styles.card}>
            {received ? (
              <View style={styles.row}>
                <Typography style={styles.grow}>
                  {t('detail.payoutReceived', {
                    amount: formatCurrency(received.amount),
                    date: formatDateShort(received.date),
                  })}
                </Typography>
                <Button
                  testID="tontine-undo-payout"
                  label={t('detail.undo')}
                  variant="ghost"
                  compact
                  onPress={() => void remove(received.id)}
                />
              </View>
            ) : tontine.payoutTurn !== null ? (
              <View style={styles.row}>
                <Typography style={styles.grow}>
                  {t('detail.payoutExpected', { amount: formatCurrency(tontine.summary.payoutAmount) })}
                </Typography>
                <Button
                  testID="tontine-record-payout"
                  label={t('detail.recordPayout')}
                  variant="secondary"
                  compact
                  onPress={() => setSheet({ kind: 'payout', amount: tontine.summary.payoutAmount })}
                />
              </View>
            ) : (
              <Typography variant="muted">{t('list.noTurn')}</Typography>
            )}
          </Card>

          <Card>
            <Typography variant="label">{t('detail.schedule')}</Typography>
            {tontine.cycles.map((cycle) => (
              <CycleRow
                key={cycle.cycle}
                cycle={cycle}
                onPay={() => setSheet({ kind: 'contribution', cycle: cycle.cycle })}
                onUndo={() => (cycle.payment ? void remove(cycle.payment.id) : undefined)}
              />
            ))}
          </Card>

          <Button
            testID="tontine-edit"
            label={t('detail.edit')}
            variant="secondary"
            onPress={() => router.push(`/tontines/edit/${tontineId}`)}
          />
        </ScrollView>
      ) : null}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <PaymentSheet
        mode={sheet}
        accountId={tontine?.accountId ?? null}
        onSave={save}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    grow: { flex: 1 },
    pad: { paddingHorizontal: SPACING.lg },
    content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
    card: { gap: SPACING.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    error: { color: c.DANGER, paddingHorizontal: SPACING.lg },
  });
