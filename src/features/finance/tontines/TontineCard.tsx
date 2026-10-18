import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import type { TontineWithSummary } from './tontines.types';

export interface TontineCardProps {
  tontine: TontineWithSummary;
  /** Omitted on the detail screen, where the card is the header. */
  onPress?: () => void;
}

/**
 * One tontine at a glance (VS-51): the contribution and cycle, the user's turn
 * and the pot it brings, how many contributions are paid, what is overdue, and
 * where the user stands — ahead before the payout, behind after it.
 */
export function TontineCard({ tontine, onPress }: TontineCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('tontines');
  const { summary } = tontine;

  const body = (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Typography variant="subheading" style={styles.grow}>
          {tontine.name}
        </Typography>
        {summary.isFinished ? <Pill label={t('list.finished')} tone="success" /> : null}
        {summary.overdueCount > 0 ? (
          <Pill label={t('list.overdue', { count: summary.overdueCount })} tone="danger" />
        ) : null}
      </View>

      <Typography variant="muted">
        {t(`list.${tontine.frequency}`, { amount: formatCurrency(tontine.contributionAmount), count: tontine.members })}
      </Typography>
      <Typography>
        {tontine.payoutTurn !== null && summary.payoutDate
          ? t('list.turn', {
              turn: tontine.payoutTurn,
              members: tontine.members,
              amount: formatCurrency(summary.payoutAmount),
              date: formatDateShort(summary.payoutDate),
            })
          : t('list.noTurn')}
      </Typography>

      <ProgressBar
        value={(summary.paidCount / tontine.members) * 100}
        color={summary.isFinished ? c.SUCCESS : undefined}
      />
      <Typography variant="muted">{t('list.progress', { paid: summary.paidCount, total: tontine.members })}</Typography>
      <Typography variant="muted">
        {summary.position > 0
          ? t('list.ahead', { amount: formatCurrency(summary.position) })
          : summary.position < 0
            ? t('list.behind', { amount: formatCurrency(-summary.position) })
            : t('list.level')}
      </Typography>
    </Card>
  );

  if (!onPress) return body;
  return (
    <Pressable testID={`tontine-card-${tontine.id}`} accessibilityRole="button" onPress={onPress}>
      {body}
    </Pressable>
  );
}

const makeStyles = (_c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    grow: { flex: 1 },
  });
