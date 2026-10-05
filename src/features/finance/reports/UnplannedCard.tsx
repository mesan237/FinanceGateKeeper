import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import type { UnplannedSummary } from './reports.types';

export interface UnplannedCardProps {
  summary: UnplannedSummary;
}

/**
 * The month's imprévus on the Reports tab: how many there were, what they cost,
 * their share of the month's spending, and last month's figures beside them.
 * A month without any says so and explains how to mark one.
 */
export function UnplannedCard({ summary }: UnplannedCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('reports');
  const { count, total, sharePct, previous } = summary;

  return (
    <Card testID="unplanned-card" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.marker} />
        <Typography variant="subheading">{t('unplanned.title')}</Typography>
      </View>

      {count === 0 ? (
        <>
          <Typography>{t('unplanned.none')}</Typography>
          <Typography variant="muted">{t('unplanned.hint')}</Typography>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <Typography>{t('unplanned.count', { count })}</Typography>
            <Typography testID="unplanned-total" style={styles.total}>
              {formatCurrency(total)}
            </Typography>
          </View>
          <Typography variant="muted">
            {sharePct < 1
              ? t('unplanned.shareUnderOne')
              : t('unplanned.share', { percent: Math.round(sharePct) })}
          </Typography>
        </>
      )}

      {previous.count > 0 ? (
        <Typography variant="muted">
          {t('unplanned.previous', {
            count: previous.count,
            amount: formatCurrency(previous.total),
          })}
        </Typography>
      ) : null}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: 6, borderLeftWidth: 3, borderLeftColor: c.WARNING },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    marker: { width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: c.WARNING },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    total: { color: c.WARNING_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
